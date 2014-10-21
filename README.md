# Gulp Styleguide

A gulp pipeline for building styleguide documentation from [DSS][] comments in your CSS/SCSS/LESS.


## Usage

    var gulp = require('gulp');
    var styleguide = require('gulp-styleguide');
    var options = {
        site: {
            title: 'Test Pattern Library'
        }
    };

    gulp.task('styleguide', styleguide.build(options));

Then run:

    gulp styleguide


For development you can run a server which watches for changes and has livereload with:

    gulp.task('server', styleguide.server());

This is really only for convenience, you may find it more useful to write your own server task.


## Options

### `styleguide.build(options)`

* `src.css` - Path to your CSS files. Optional, defaults to `'src/scss/**/*.{css,less,scss}'`.
* `src.templates` - Path to your Mustache templates. Optional, defaults to `'src/templates/**/*.{mustache,html}'`
* `dest.html` - Path to output HTML to. Optional, defaults to `dist/public`.
* `dest.templates` - Path to output compiled templates to. This is just somehwere to keep them during the build, so your probably don't want to change it. Optional, defaults to `dist/templates`.
* `site` - An object to contain the outputted website. This can contain any variables you want to make available to your templates. It will have an `index` property appended which contains the site tree, more on that below. Optional, defaults to `{ site: { title: 'Styleguide' } }`.
 
### `styleguide.server(options)`

* `port` - Port to run server on. Optional, defaults to 8745.
* `documentRoot` - Where to find HTML files, which should be the same as where your HTML is output. Optional, defaults to `dist/html`.
* `watchPaths` - Paths to watch for changes. Optional, defaults to default paths for CSS and templates i.e. `['src/scss/**/*.{css,less,scss}', 'src/templates/**/*.{mustache,html}']`
* `watchTasks` - tasks to run when the files in `watchPaths` change. Optional, defaults to `['styleguide.templates', 'styleguide.build']` (the two "private" tasks behind `styleguide.build()`).

## File Structure

The structure of the HTML reflects the structure of your CSS. For that reason it's best to separate your CSS into directories that reflect the purpose of the CSS. Here's an example using SCSS and a SMACSS structure:

    scss/
        index.scss
        base/
            index.scss
            headings.scss
            text.scss
        layout/
            index.scss
            grid.scss
        modules/
            index.scss
            accordion.scss
            toolbar.scss
        state/
            index.scss
            mobile.scss
            errors.scss

The `index.scss` is required to build a section index. The first comment block's `@name` will be used for the section name. It's a good place to put any introductory text for the section in the `@description` annotation.

By convention the `index.scss` should only have minimal CSS and import the rest of the files for that section, but this is not required.


## What this doesn't do

When making a useful re-usable gulp pipeline it's often difficult to draw a line under what it should or shouldn't do, but here's where the current line is drawn:

* Does not compile your SASS/LESS
* Does not do any image, icon or font processing
* Does not do any minification/uglifying

The general philosophy is not to do *any* processing of your assets. It will only extract the DSS from your CSS (or SASS or LESS) and produce some HTML output using your templates.

You should add any additional steps for processing your assets to your own gulpfile.

[DSS]:https://github.com/darcyclarke/DSS

