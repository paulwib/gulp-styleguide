'use strict';

var gulp = require('gulp');
var dss = require('dss');
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
            .pipe(dss)
            .pipe(gulp.dest(options.dest));
    });
}
module.exports = setup;
