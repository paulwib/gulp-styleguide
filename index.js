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
var crypto = require('crypto');

// Default options
var defaultOptions = {
    server: {
        port: 8745,
        documentRoot: 'dist/',
        watchPaths: ['src/**/*.{css,less,scss}', __dirname + '/resources/**/*'],
        reloadPaths: ['dist/**/*'],
        watchTasks: ['styleguide.templates', 'styleguide.build']
    },
    build: {
        src: {
            css: 'src/**/*.{css,less,scss}',
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
            cb(new gutil.PluginError('gulp-styleguide',  'Streaming not supported'));
            return;
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
function variableDssParser() {

    var fileVariables = {},
        fileVariablesRx = /^[\$|@]([a-zA-Z0-9_]+):([^\;]+)\;/gim,
        lineSplitRx = /((\s|-)+)/,
        variables = {},
        match, hash, tokens, name;

    return function(i, line, block, css) {
        hash = crypto.createHash('md5').update(css).digest('hex');
        if (!fileVariables[hash]) {
            while ((match = fileVariablesRx.exec(css)) !== null) {
                variables[match[1].trim()] = match[2].trim();
            }
            fileVariables[hash] = variables;
        }

        // Extract name and any delimiter with description
        tokens = line.split(lineSplitRx, 2);
        name = tokens[0].trim();
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

    var template, firstBlock;

    // Add parsers
    dss.parser('order', function(i, line) { return line; });
    dss.parser('template', function(i, line, block) { return line; });
    dss.parser('partial', partialDssParser);
    dss.parser('variable', variableDssParser());

    return es.map(function(file, cb) {
        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            cb(new gutil.PluginError('gulp-styleguide',  'Streaming not supported'));
            return;
        }
        file.meta = {};
        var basename = path.basename(file.relative, path.extname(file.path));

        dss.parse(file.contents.toString(), {}, function(dss) {

            // Extract file level properties
            if (dss.blocks.length) {
                firstBlock = dss.blocks[0];
                // Get section name from index file
                if (basename === 'index') {
                    file.meta.sectionName = firstBlock.name;
                }
                // Get sub-section name from first blocks name (and delete name to avoid repetition)
                else {
                    file.meta.subsectionName = firstBlock.name;
                    delete dss.blocks[0].name;
                }
                // Extras
                ['order', 'template'].forEach(function(prop) {
                    if (firstBlock[prop]) {
                        file.meta[prop] = firstBlock[prop];
                        delete firstBlock[prop];
                    }
                });
            }

            // Massaging block data
            dss.blocks.forEach(function(block) {
                // Convert decsription from markdown to HTML
                if (block.hasOwnProperty('description')) {
                    block.description = markdown(String(block.description));
                }
                // Normalize state to an array and add markup examples for each state
                if (block.hasOwnProperty('state') && block.hasOwnProperty('markup')) {
                    if (typeof block.state.slice !== 'function') {
                        block.state = [block.state];
                    }

                    template = hogan.compile(block.markup.example);
                    block.markup.example = template.render({}).replace(/[a-z]+="\s*"/gi, '');
                    block.markup.escaped = block.markup.example.replace(/</g, '&lt;').replace(/>/g, '&gt;');

                    block.state.forEach(function(state) {
                        state.markup = {
                            example: template.render(state),
                            escaped: template.render(state).replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
        if (!templates.hasOwnProperty(templateName)) {
            cb(new gutil.PluginError('gulp-styleguide', 'Template "' + templateName + '" missing'));
        }
        else {
            var html = templates[templateName].render({
                meta: file.meta,
                dss: file.dss,
                site: site,
                content: content
            }, templates);

            file.contents = new Buffer(html);
            cb(null, file);
        }
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
