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

// Set up some additional parsers for properties to be copied to the file
var fileMetaProps = ['order', 'template'];
fileMetaProps.forEach(function(prop) {
    dss.parser(prop, function(i, line, block){
        return line;
    });
});

dss.parser('partial', function(i, line, block){
    return line;
});

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

// Somewhere to store compiled templates
var compiledTemplates = {};

/**
 * Build combines 2 tasks: compile the templates and build the HTML
 */
function build(options) {
    options = extend(true, defaultOptions.build, options);

    gulp.task('styleguide.templates', function() {
        return gulp.src(options.src.templates)
            .pipe(templateCompile());
    });
    gulp.task('styleguide.build', ['styleguide.templates'], function() {
        return gulp.src(options.src.css)
            .pipe(extract())
            .pipe(ssg(options.site, {
                sectionProperties: ['sectionName'],
                sort: 'order'
            }))
            .pipe(render(options.site, compiledTemplates))
            .pipe(gulp.dest(options.dest.html));
    });

    return ['styleguide.templates', 'styleguide.build'];
}

/**
 * Pipe for compiling templates, stored in compiledTemplates, no files output
 */
function templateCompile() {

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
        compiledTemplates[templateName] = hogan.compile(file.contents.toString('utf8'));

        cb(null, file);
    });
}

/**
 * Task to start server to view the guide, watch for changes and livereload
 * (livereload requires a browser plug-in)
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
 * Pipe for adding DSS to file
 */
function extract() {

    var template, stateExample, stateEscaped;

    return es.map(function(file, cb) {
        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            return this.emit('error', new gutil.PluginError('gulp-styleguide',  'Streaming not supported'));
        }
        file.meta = {};
        var basename = path.basename(file.relative, path.extname(file.path)),
            fileString  = file.contents.toString();

        // Extract variables from the file
        var rx = /^\$([a-zA-Z0-9_]+):([^\;]+)\;/gim, variables = {}, match;
        while ((match = rx.exec(fileString)) !== null) {
            variables[match[1].trim()] = match[2].trim();
        }

        // Add variable parser
        dss.parser('variable', function(i, line, block) {
            // Extract name and any delimiter with description
            var tokens = line.split(/((\s|-)+)/, 2);
            var name = tokens[0].trim();
            if (variables.hasOwnProperty(name)) {
                return {
                    name: name,
                    // Description is line with name and any delimiter replaced
                    description: line.replace(tokens.join(''), ''),
                    value: variables[name]
                };
            }
        });

        dss.parse(fileString, {}, function(dss) {

            if (dss.blocks.length) {

                // Get section name from index
                if (basename === 'index') {
                    file.meta.sectionName = dss.blocks[0].name;
                }
                // Get sub-section name from first blocks name (and delete name to avoid repetition)
                else {
                    file.meta.subsectionName = dss.blocks[0].name;
                    delete dss.blocks[0].name;
                }
                // Properties to copy from first block that apply to whole file
                fileMetaProps.forEach(function(prop) {
                    if (dss.blocks[0][prop]) {
                        file.meta[prop] = dss.blocks[0][prop];
                    }
                });
            }
            dss.blocks.forEach(function(block) {
                if (block.hasOwnProperty('description')) {
                    block.description = markdown(String(block.description));
                }
                // @partial creates a lambda on this block to inject custom partial,
                // use {{#partial}}{{/partial}} in your template
                if (block.hasOwnProperty('partial')) {
                    var partialTag = '{{>' + block.partial + '}}';
                    block.partial = function() {
                        return function() {
                            return partialTag;
                        };
                    };
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
