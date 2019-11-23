'use strict';

var url = require('url');
var gulp = require('gulp');
var sass = require('gulp-sass');
var del = require('del');
var http = require('http');
var send = require('send');
var livereload = require('gulp-livereload');
var log = require('fancy-log');
var styleguide = require('../');

// Add styleguide task
var options = {
    site: {
        title: 'Test Styleguide'
    },
    src: {
        css: 'src/scss/**/*.{css,less,scss}',
        templates: ['resources/templates/**/*.mustache']
    }
};

// Template compilation must happen before styleguide build and use same options object,
// as that's where compiled templates are stored
gulp.task('templates', styleguide.templates(options));
gulp.task('styleguide', ['clean', 'templates'], styleguide.build(options));

// Add SASS task (styleguide does not convert assets, only extracts data for HTML)
gulp.task('sass', ['clean'], function () {
    return gulp.src('src/scss/index.scss')
        .pipe(sass())
        .pipe(gulp.dest('dist/css'));
});

// Add JS task (copies pseudo-state JS into place)
gulp.task('js', ['clean'], function () {
    return gulp.src(__dirname + '/../resources/js/pseudo-state.js')
        .pipe(gulp.dest('dist/js'));
});

// Add clean task
gulp.task('clean', function(cb) {
    return del('dist/**/*', cb);
});

// Add server task, with live reload
gulp.task('server', ['default'], function() {

    var port = 8745;

    gulp.watch(['src/**/*', 'resources/**/*', __dirname + '/../resources/**/*'], ['default']);

    http.createServer(function (req, res) {
        send(req, url.parse(req.url).pathname, { root: './dist'  }).pipe(res);
    }).listen(port);

    log.info('Preview website running on http://localhost:' + port);

    if(process.platform !== 'win32') {
        var server = livereload();
        gulp.watch('dist/**/*').on('change', function(file) {
            server.changed(file.path);
        });
    }
});

// Add default task
gulp.task('default', ['js', 'sass', 'styleguide']);
