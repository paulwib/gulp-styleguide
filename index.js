'use strict';

/**
 * A gulp pipeline for generating a styleguide from DSS comments
 */
var dss = require('dss');
var ecstatic = require('ecstatic');
var es = require('event-stream');
var extend = require('extend');
var gulp = require('gulp');
var gutil = require('gulp-util');
var http = require('http');
var livereload = require('gulp-livereload');
var markdown = require('marked');
var ssg = require('gulp-ssg');
var hogan = require('hogan-updated');
var through = require('through');
var path = require('path');

// Default options
var defaultOptions = {
    server: {
        port: 8745,
        documentRoot: 'dist/',
        watchPaths: ['src/scss/**/*.{css,less,scss}', __dirname + '/resources/**/*'],
        reloadPaths: ['dist/**/*'],
        watchTasks: ['styleguide.templates', 'styleguide.build']
    },
    build: {
        src: {
            css: 'src/scss/**/*.{css,less,scss}',
            templates: __dirname + '/resources/templates/**/*.{mustache,html}'
        },
        dest: {
            html: 'dist/',
            templates: 'dist/templates'
        },
        site: {
            title: 'Styleguide'
        }
    }
};

/**
 * Build combines 2 tasks: compile the templates and build the HTML
 *
 * @param {object} options
 * @return {array} Tasks to run
 */
function build(options) {

    var templates = {};
    options = extend(true, defaultOptions.build, options);

    gulp.task('styleguide.templates', function() {
        return gulp.src(options.src.templates)
            .pipe(templateCompile(templates));
    });
    gulp.task('styleguide.build', ['styleguide.templates'], function() {
        return gulp.src(options.src.css)
            .pipe(extract())
            .pipe(ssg(options.site, {
                sectionProperties: ['sectionName'],
                sort: 'order'
            }))
            .pipe(render(options.site, templates))
            .pipe(gulp.dest(options.dest.html));
    });

    return ['styleguide.templates', 'styleguide.build'];
}

/**
 * Pipe for compiling templates, no files output
 *
 * @param {object} templates - reference to store templates i
 * @return {stream}
 */
function templateCompile(templates) {

    return es.map(function(file, cb) {
        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            return this.emit('error', new gutil.PluginError('gulp-styleguide',  'Streaming not supported'));
        }
        var templateName = path.join(
            path.dirname(file.relative),
            path.basename(file.relative, path.extname(file.relative))
        );
        templates[templateName] = hogan.compile(file.contents.toString('utf8'));

        cb(null, file);
    });
}

/**
 * Task to start server to view the guide, watch for changes and livereload
 * (livereload requires a browser plug-in)
 *
 * @param {object} options
 * @return {function}
 */
function server(options) {

    options = extend(true, defaultOptions.server, options);

    return function() {
        gulp.watch(options.watchPaths, options.watchTasks);

        http.createServer(
            ecstatic({ root: options.documentRoot })
        ).listen(options.port);
        gutil.log('Preview website running on http://localhost:' + gutil.colors.magenta(options.port));

        if(process.platform !== 'win32') {
            gutil.log('Running livereload, watching: ' + gutil.colors.magenta(options.reloadPaths));
            var server = livereload();
            gulp.watch(options.reloadPaths).on('change', function(file) {
                server.changed(file.path);
            });
        }
    };
}

/**
 * Get parser for a file which will extract "@variable {name} - {description}"
 *
 * @param {object} file - The file to extract the variable values from
 * @return {function} A DSS parser
 */
function getVariableDssParser(file) {

    var fileVariablesRx = /^\$([a-zA-Z0-9_]+):([^\;]+)\;/gim,
        lineSplitRx = /((\s|-)+)/,
        variables = {},
        match;

    while ((match = fileVariablesRx.exec(file.contents.toString())) !== null) {
        variables[match[1].trim()] = match[2].trim();
    }

    return function(i, line, block) {
        // Extract name and any delimiter with description
        var tokens = line.split(lineSplitRx, 2);
        var name = tokens[0].trim();
        if (variables.hasOwnProperty(name)) {
            return {
                name: name,
                // Description is line with name and any delimiter replaced
                description: line.replace(tokens.join(''), ''),
                value: variables[name]
            };
        }
    };
}

/**
 * Parser to extract "@partial" and add a lambda to the block so you can use that
 * partial in the template for the block with {{#partial}}{{/partial}} (because
 * there is no such thing as variable partial names in Mustache)
 *
 * @param {number} i - Block number
 * @param {string} line - Text after "@partial"
 * @param {string} block - Entire DSS block
 */
function partialDssParser(i, line, block) {
    var partialTag = '{{>' + line + '}}';
    return function() {
        return function() {
            return partialTag;
        };
    };
}

/**
 * Pipe for extracting DSS and adding to the file's properties
 *
 * @return {stream}
 */
function extract() {

    var template, stateExample, stateEscaped;

    // Add static parsers
    dss.parser('order', function(i, line) { return line; });
    dss.parser('template', function(i, line) { return line; });
    dss.parser('partial', partialDssParser);

    return es.map(function(file, cb) {
        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            return this.emit('error', new gutil.PluginError('gulp-styleguide',  'Streaming not supported'));
        }
        file.meta = {};
        var basename = path.basename(file.relative, path.extname(file.path));

        // Add dynamic parsers
        dss.parser('variable', getVariableDssParser(file));

        dss.parse(file.contents.toString(), {}, function(dss) {

            if (dss.blocks.length) {

                var firstBlock = dss.blocks[0];

                // Get section name from index
                if (basename === 'index') {
                    file.meta.sectionName = firstBlock.name;
                }
                // Get sub-section name from first blocks name (and delete name to avoid repetition)
                else {
                    file.meta.subsectionName = firstBlock.name;
                    delete dss.blocks[0].name;
                }
                // Properties to copy from first block that apply to whole file
                ['order', 'template'].forEach(function(prop) {
                    if (firstBlock[prop]) {
                        file.meta[prop] = firstBlock[prop];
                        delete firstBlock[prop];
                    }
                });
            }
            dss.blocks.forEach(function(block) {
                if (block.hasOwnProperty('description')) {
                    block.description = markdown(String(block.description));
                }
                if (block.hasOwnProperty('state') && block.hasOwnProperty('markup')) {
                    // Normalize state to an array (by default one state is an object)
                    if (typeof block.state.slice !== 'function') {
                        block.state = [block.state];
                    }
                    template = hogan.compile(block.markup.example);

                    // Render once with no state (stripping empty attributes)
                    block.markup.example = template.render({}).replace(/[a-z]+="\s*"/gi, '');
                    block.markup.escaped = block.markup.example.replace(/</g, '&lt;').replace(/>/g, '&gt;');

                    // Render template again for each state
                    block.state.forEach(function(state) {
                        stateExample = template.render(state);
                        stateEscaped = stateExample.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        state.markup = {
                            example: stateExample,
                            escaped: stateEscaped
                        };
                    });
                }
            });
            file.dss = dss;
            cb(null, file);
        });
    });
}

/**
 * Pipe for rendering templates with data
 *
 * @param {object} site - The full content tree
 * @param {object} templates - Compiled mustache templates
 * @return {stream}
 */
function render(site, templates) {

    return es.map(function(file, cb) {

        var content, templateName;

        if (file.meta.template) {
            templateName = file.meta.template;
        }
        else if (file.meta.isIndex) {
            templateName = 'pages/index';
        }
        else {
            templateName = 'pages/default';
        }
        try {
            var html = templates[templateName].render({
                meta: file.meta,
                dss: file.dss,
                site: site,
                content: content
            }, templates);

            file.contents = new Buffer(html);

        } catch (e) {
            throw new Error('Template "' + templateName + '" failed to render, invalid or missing');
        }

        cb(null, file);
    });
}

/**
 * Export the available tasks
 */
module.exports = {
    build: build,
    server: server,
    defaultOptions: defaultOptions
};
