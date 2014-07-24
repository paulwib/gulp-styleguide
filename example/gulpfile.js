'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');

// Set up styleguide pipeline, returns merged options
var options = require('../styleguide').setup({

    // Website configuration
    site: {
        title: 'Test Pattern Library'
    },

    // Add paths to watch
    watchPaths: [],

    // Add tasks to run on change
    watchTasks: ['sass'],

    // These paths aren't in the regular options, but we can add them for convenience
    // to have all our paths in one object
    src: {
        scss: 'scss/main.scss'
    },
    dest: {
        css: 'styleguide/css'
    }
});

// Convert SCSS to CSS, because that's what this example uses
// You could use LESS or plain CSS instead, as long as you configure
// source directories correctly.
// Remember, this pipline does *no* asset processing.
gulp.task('sass', ['styleguide'], function () {
    return gulp.src(options.src.scss)
        .pipe(sass())
        .pipe(gulp.dest(options.dest.css));
});

// Default build task
gulp.task('default', ['sass', 'styleguide']);
