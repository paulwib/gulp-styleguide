'use strict';

/**
 * A gulp pipeline for generating a styleguide from DSS comments
 */
var ecstatic = require('ecstatic');
var extend = require('extend');
var gulp = require('gulp');
var http = require('http');
var livereload = require('gulp-livereload');
var ssg = require('gulp-ssg');
var gutil = require('gulp-util');
var extract = require('./lib/extract');
var render = require('./lib/render');
var templates = require('./lib/templates');

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

    var templateStore = {};
    options = extend(true, defaultOptions.build, options);

    gulp.task('styleguide.templates', function() {
        return gulp.src(options.src.templates)
            .pipe(templates(templateStore));
    });
    gulp.task('styleguide.build', ['styleguide.templates'], function() {
        return gulp.src(options.src.css)
            .pipe(extract())
            .pipe(ssg(options.site, {
                sectionProperties: ['sectionName'],
                sort: 'order'
            }))
            .pipe(render(options.site, templateStore))
            .pipe(gulp.dest(options.dest.html));
    });

    return ['styleguide.templates', 'styleguide.build'];
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
 * Export the available tasks
 */
module.exports = {
    build: build,
    server: server,
    defaultOptions: defaultOptions
};
