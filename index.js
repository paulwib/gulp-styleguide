'use strict';

/**
 * A gulp pipeline for generating a styleguide from DSS comments
 */
var clean = require('gulp-clean');
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
var templateCompiler = require('gulp-hogan-compile');
var through = require('through');
var path = require('path');
var gulpFilter = require('gulp-filter');

var defaultOptions = {
    taskNames: {
        main: 'styleguide',
        templates: 'styleguide.templates',
        build: 'styleguide.build',
        server: 'styleguide.server',
        clean: 'styleguide.clean'
    },
    watchPaths: [],
    watchTasks: [],
    src: {
        css: 'src/scss/**/*.{scss,md}',
        templates: 'src/templates/**/*.{html,mustache}'
    },
    dest: {
        html: 'dist/',
        templates: 'dist/templates'
    },
    site: {
        title: 'Styleguide'
    }
};

/**
 * Set-up the default set of tasks
 *
 * If not flexible enough then build your own pipeline, it's not too hard :)
 */
function setup(options) {

    options = extend(true, defaultOptions, options);
    var tasks = options.taskNames;

    options.watchPaths.push(options.src.css, options.src.templates);
    options.watchTasks.unshift(tasks.main);

    gulp.task(tasks.clean, cleanup(options));
    gulp.task(tasks.templates, [tasks.clean], compileTemplates(options));
    gulp.task(tasks.build, [tasks.templates], build(options));
    gulp.task(tasks.server, [tasks.build], server(options));
    gulp.task(tasks.main, [tasks.clean, tasks.build]);

    return options;
}

/**
 * Task to compile the templates
 *
 * The main point of pre-compiling templates is so you have a full set of
 * partials available. It also means templates are reloaded when viewing on
 * preview server.
 */
function compileTemplates(options) {

    return function() {
        return gulp.src(options.src.templates)
            .pipe(templateCompiler('index.js', {
                wrapper: 'commonjs',
                hoganModule: 'hogan.js',
                templateName: function (file) {
                    return path.join(
                        path.dirname(file.relative),
                        path.basename(file.relative, path.extname(file.relative))
                    );
                }
            }))
            .pipe(gulp.dest(options.dest.templates));
    };
}

/**
 * Task to build the HTML output
 */
function build(options) {

    return function() {
        var templates = require(process.cwd() + '/' + options.dest.templates);
        delete require.cache[process.cwd() + '/' + options.dest.templates + '/index.js'];

        // Don't want to include your main.scss file - bit hacky
        var filter = gulpFilter(function(file) {
            return path.basename(file.relative) !== 'main.scss';
        });

        return gulp.src(options.src.css)
            .pipe(filter)
            .pipe(extract())
            .pipe(ssg(options.site, { sectionProperties: ['sectionName'] }))
            .pipe(template(options.site, templates))
            .pipe(gulp.dest(options.dest.html));
    };
}

/**
 * Task to start server to view the guide, watch for changes and livereload
 */
function server(options) {

    return function() {
        gulp.watch(options.watchPaths, options.watchTasks);

        // Create a server for previewing
        var port = 8745;
        http.createServer(
            ecstatic({ root: options.dest.html })
        ).listen(port);
        gutil.log('Preview website running on http://localhost:' + gutil.colors.magenta(port));
        gutil.log('Watching paths: ' + gutil.colors.magenta(options.watchPaths.join(', ')));
        gutil.log('Watch runs tasks: ' + gutil.colors.magenta(options.watchTasks.join(', ')));

        // Live reload when files change (requires browser plug-in)
        if(process.platform !== 'win32') {
            gutil.log('Running livereload, watching: ' + gutil.colors.magenta(options.dest.html));
            var server = livereload();
            gulp.watch(options.dest.html + '/**').on('change', function(file) {
                server.changed(file.path);
            });
        }
    };
}

/**
 * Task to clean up generated files
 */
function cleanup(options) {

    return function() {
        return gulp.src([options.dest.html], { read: false })
            .pipe(clean());
    };
}

/**
 * Pipe for adding DSS to file
 */
function extract() {

    return es.map(function(file, cb) {
        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            return this.emit('error', new gutil.PluginError('gulp-dss',  'Streaming not supported'));
        }
        file.meta = {};

        // Parse the DSS
        dss.parse(file.contents.toString(), {}, function(dss) {
            // Get section name from first blocks name, will be copied to site.index.sections[...]
            if (dss.blocks.length) {
                file.meta.sectionName = dss.blocks[0].name;
            }
            dss.blocks.forEach(function(block) {
                if (block.hasOwnProperty('description')) {
                    block.description = markdown(String(block.description));
                }
            });
            file.dss = dss;
            cb(null, file);
        });
    });
}

/**
 * Pipe for templating
 */
function template(site, templates) {

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
 * Export the task setup function
 */
module.exports = {
    setup: setup
};
