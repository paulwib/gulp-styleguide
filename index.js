'use strict';

/**
 * A gulp pipeline for generating a styleguide from DSS comments
 */
var extend = require('extend');
var gulp = require('gulp');
var ssg = require('gulp-ssg');
var gutil = require('gulp-util');
var extract = require('./lib/extract');
var render = require('./lib/render');
var compileTemplates = require('./lib/templates');

// Default options
var defaultOptions = {
    src: {
        css: 'src/**/*.{css,less,scss}',
        templates: []
    },
    dest: {
        html: 'dist/',
    },
    site: {
        title: 'Styleguide'
    }
};

// Compiled templates kept in local scope
var compiledTemplates = {};

/**
 * Task to compile Mustache templates with hogan.js
 */
function templates(options) {

    options = extend(true, defaultOptions, options);

    // Add default templates
    if (typeof options.src.templates.unshift === 'function') {
        options.src.templates.push(__dirname + '/resources/templates/**/*.{mustache,html}');
    }

    return function() {
        return gulp.src(options.src.templates)
            .pipe(compileTemplates(compiledTemplates));
    };
}

/**
 * Task to build the styleguide, depends on templates
 */
function build(options) {

    options = extend(true, defaultOptions, options);

    return function() {

        return gulp.src(options.src.css)
            .pipe(extract())
            .pipe(ssg(options.site, {
                sectionProperties: ['sectionName'],
                sort: 'order'
            }))
            .pipe(render(options.site, compiledTemplates))
            .pipe(gulp.dest(options.dest.html));
    };
}

/**
 * Export the available tasks
 */
module.exports = {
    templates: templates,
    build: build,
    defaultOptions: defaultOptions
};
