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
* `src.templates` - Path to your Mustache templates. Optional, defaults to path to `templates/` in this library.
* `dest.html` - Path to output HTML to. Optional, defaults to `dist/`.
* `site` - An object to contain the outputted website. This can contain any variables you want to make available to your templates. It will have an `index` property appended which contains the site tree, more on that below. Optional, defaults to `{ site: { title: 'Styleguide' } }`.

### `styleguide.server(options)`

* `port` - Port to run server on. Optional, defaults to 8745.
* `documentRoot` - Where to find HTML files, which should be the same as where your HTML is output. Optional, defaults to `dist/html`.
* `watchPaths` - Paths to watch for changes. Optional, defaults to default paths for CSS and templates i.e. `['src/scss/**/*.{css,less,scss}', __dirname + 'templates/**/*.{mustache,html}']`
* `watchTasks` - tasks to run when the files in `watchPaths` change. Optional, defaults to `['styleguide.templates', 'styleguide.build']` (the two "private" tasks behind `styleguide.build()`).


## File Structure

The structure of the HTML reflects the structure of your CSS. For that reason it's nice to separate your CSS into directories that reflect the purpose of the CSS. Here's an example using SCSS and a [SMACSS][] structure:

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


## Templating

Templates our written in Mustache. There are 2 required templates `page/default.mustache` and `page/index.mustache`. The `default` page is used for rendering the content from a single CSS file. The `index` page is used for each directory index. The packaged version will render all the files for a particular section.

You are free to override with your own templates, add layout and partials etc. provided you have the 2 required templates. See the `templates/` directory for an example.

There are a number of preset variables available:

* `site.index` - This contains a full content-tree of the entire styleguide. This is built with [gulp-ssg][] - see the documentation for more info, but basically it allows you to do things like make navigation, render sub-pages in pages etc.
* `meta` - Each file has a `meta` property that contains things like the `url`. Again see the [gulp-ssg][] documentation for full details and information on how you can add your own properties.
* `dss` - Each file has a `dss` property, see the [DSS][] documentation for more info about what that contains.

You can add any other variables you like to `site` by passing it with the options, just be careful not to override.

## Custom DSS Parsers

These parsers are added in addition to default name, description, states and markup:

* `@order` - Set the files sort order, lower numbers will come first in the site index.

## What this doesn't do

When making a useful re-usable gulp pipeline it's often difficult to draw a line under what it should or shouldn't do, but here's where the current line is drawn:

* Does not compile your SASS/LESS
* Does not do any image, icon or font processing
* Does not do any minification/uglifying

The general philosophy is not to do *any* processing of your assets. It will only extract the DSS from your CSS (or SASS or LESS) and produce some HTML output using your templates.

You should add any additional steps for processing your assets to your own gulpfile.

[SMACSS]:https://smacss.com/
[DSS]:https://github.com/darcyclarke/DSS
[gulp-ssg]:https://github.com/paulwib/gulp-ssg

