'use strict';

var dss = require('./');
var gulp = require('gulp');
var extend = require('extend');


var defaultOptions = {
    taskName: 'dss',
    src: 'scss/**/*.scss',
    dest: 'styleguide/'
};

function setup(options) {

    options = extend(defaultOptions, options);

    gulp.task(options.taskName, function() {
        return gulp.src(options.src)
            .pipe(dss.extract())
            .pipe(gulp.dest(options.dest));
    });
}

module.exports = setup;
