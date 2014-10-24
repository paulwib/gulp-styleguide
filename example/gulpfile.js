'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var styleguide = require('../');
var del = require('del');

// Add styleguide task
var options = {
    site: {
        title: 'Test Styleguide'
    },
	src: {
        // Add custom templates
	    templates: ['resources/templates/**/*.mustache', styleguide.defaultOptions.build.src.templates]
	}
};
gulp.task('styleguide', styleguide.build(options));

// Add server to preview style guide and livereload
gulp.task('server', ['default'], styleguide.server({ watchTasks: ['default'] }));

// Add SASS task (styleguide does not convert assets, only extracts data for HTML)
gulp.task('sass', ['styleguide'], function () {
    return gulp.src('src/scss/index.scss')
        .pipe(sass())
        .pipe(gulp.dest('dist/css'));
});

// Copy pseudo-state JS into place
gulp.task('js', function () {
    return gulp.src(__dirname + '/../resources/js/pseudo-state.js')
        .pipe(gulp.dest('dist/js'));
});

// Clean dist
gulp.task('clean', function(cb) {
    return del('dist/**/*', cb);
});

// Default build task
gulp.task('default', ['js', 'sass', 'styleguide']);
