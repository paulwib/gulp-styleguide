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

// Set up some additional parsers
dss.parser('order', function(i, line, block){
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
        var basename = path.basename(file.relative, path.extname(file.path));

        dss.parse(file.contents.toString(), {}, function(dss) {

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
                if (dss.blocks[0].order) {
                    file.meta.order = dss.blocks[0].order;
                }
            }
            dss.blocks.forEach(function(block) {
                if (block.hasOwnProperty('description')) {
                    block.description = markdown(String(block.description));
                }
                if (block.hasOwnProperty('state')) {
                    // Normalize state to an array (by default one state is an object)
                    if (typeof block.state.forEach !== 'function') {
                        block.state = [block.state];
                    }
                    template = hogan.compile(block.markup.example);
                    block.state.forEach(function(state) {
                        stateExample = template.render({ state: 'class="' + state.escaped + '"'});
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

        var content, template;

        if (file.meta.isIndex) {
            template = templates['pages/index'];
        }
        else {
            template = templates['pages/default'];
        }

        var html = template.render({
            meta: file.meta,
            dss: file.dss,
            site: site,
            content: content
        }, templates);

        file.contents = new Buffer(html);

        cb(null, file);
    });
}

/**
 * Export the available tasks
 */
module.exports = {
    build: build,
    server: server
};
