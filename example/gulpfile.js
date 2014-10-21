'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var styleguide = require('../');
var del = require('del');

// Add styleguide task
var options = {
    site: {
        title: 'Test Pattern Library'
    },
};
gulp.task('styleguide', styleguide.build(options));

// Add server to preview style guide and livereload
gulp.task('server', ['clean', 'default'], styleguide.server({ watchTasks: ['default'] }));

// Add SASS task (remember styleguide does not convert assets, only extracts data for HTML)
gulp.task('sass', ['styleguide'], function () {
    return gulp.src('src/scss/index.scss')
        .pipe(sass())
        .pipe(gulp.dest('dist/public/css'));
});

// Clean dist
gulp.task('clean', function(cb) {
    return del('dist/**/*', cb);
});

// Default build task
gulp.task('default', ['clean', 'sass', 'styleguide']);
