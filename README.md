Gulp Styleguide  [![NPM version][npm-image]][npm-url] [![Dependency Status][depstat-image]][depstat-url] [![Build Status][travis-image]][travis-url]
===

A gulp pipeline for building styleguide documentation from [Documented Style Sheets][] (DSS) comments in your CSS/SCSS/LESS.

## Usage

Put your CSS into a directory structure with an index for each directory e.g.

    src/
        scss/
            index.scss
            base/
                index.scss
                headings.scss
            layout/
                index.scss
                grid.scss
            modules/
                index.scss
                toolbar.scss

Then in you gulpfile:

    var gulp = require('gulp');
    var styleguide = require('gulp-styleguide');
    var options = {
        site: {
            title: 'Test Pattern Library'
        }
    };

    gulp.task('templates', styleguide.templates(options));
    gulp.task('build', ['templates'], styleguide.build(options));

Then run `gulp` and a bunch of HTML files should appear in the `dist/` directory.

## File Structure

The structure of the HTML reflects the structure of your CSS. For that reason it's nice to separate your CSS into directories that reflect the purpose of the CSS.

The `index` is required to build a section index. The first comment block's `@name` will be used for the section name. It's a good place to put any introductory text for the section in the `@description` annotation.

By convention the `index` should only have minimal CSS and import the rest of the files for that section, but this is not required.

The first comment block's `@name` in non-index files will be used for the subsection name.

## Examples

There is a full gulpfile example in `example/`. This includes SASS compiling and running a preview server with livereload.

## Options

* `src.css` - Path to your CSS files. Optional, defaults to `'src/**/*.{css,less,scss}'`.
* `src.templates` - Path to your Mustache templates. Optional, defaults to path to `templates/` in this library.
* `dest.html` - Path to output HTML to. Optional, defaults to `dist/`.
* `site` - An object to contain the outputted website. This can contain any variables you want to make available to your templates. It will have an `index` property appended which contains the site tree, more on that below. Optional, defaults to `{ site: { title: 'Styleguide' } }`.


## Templating

Templates our written in Mustache. There are 2 required templates `page/default.mustache` and `page/index.mustache`. The `default` page is used for rendering the content from a single CSS file. The `index` page is used for each directory index. The packaged version will render all the files for a particular section.

You are free to override with your own templates, add layout and partials etc. provided you have the 2 required templates. See the `templates/` directory for an example.

There are a number of preset variables available:

* `site.index` - This contains a full content-tree of the entire styleguide. This is built with [gulp-ssg][] - see the documentation for more info, but basically it allows you to do things like make navigation, render sub-pages in pages etc.
* `meta` - Each file has a `meta` property that contains things like the `url`. Again see the [gulp-ssg][] documentation for full details and information on how you can add your own properties. In addition to the standard properties you'll get `meta.sectionName` and `meta.subsectioName`.
* `dss` - Each file has a `dss` property, see the [DSS][] documentation for more info about what that contains. Some additional DSS annotations are parsed as described below.

You can add any other variables you like to `site` by passing it with the options, just be careful not to override.


## Custom DSS Parsers

These parsers are in addition to default `@name`, `@description`, `@state` and `@markup`:

* `@order {integer}` - Set the files sort order, lower numbers will come first. This allows you to order sections and files (when combining several on one HTML page). Taken from first DSS block in file, others will be ignored.
* `@template {string}` - Specify the template file to use to render this file. Taken from first DSS block in file, others will be ignored.
* `@partial {string}` - Specify the partial template file to use to render this block. To use it in your template use `{{#partial}}{{/partial}}` (behind the scenes a lambda is created that will return the actual partial - this is how you can have variable partial names in Mustache).
* `@variable {name} - {description}` - Document a variable. The `name` must match the name in the file without a `$` prefix. The value will be extracted from the file and assigned to `value`. It won't be computed so things like `$height: 5px*10` will have a literal value `5px*10`.

Also the `state` is post-parsed to add HTML examples for each state. This is rendered with the `state` (using Mustache) so you can add class names etc. For example:

    /**
     * @name Button
     * @state .primary - Primary button
     * @state .danger - Dangerous button
     * @markup
     * <button class="{{{escaped}}}">{{description}}</button>
     */

As well as `block.markup` each state will now have `markup.example` and `markup.escaped` added. Empty attributes will be stripped from the stateless example to avoid clutter.

## Pseudo State

In order to make examples for pseudo state like `:hover` work there is a client-side JS file `resources/js/pseudo-state.js` which you should include in your built styleguide. This creates new rules for the escaped class name generated by DSS, like `.pseudo-class-hover`, by copying from the real pseudo rule.

## What This Doesn't Do

The general philosophy is not to do *any* processing of your assets. It will only extract the DSS from your CSS (or SASS or LESS) and produce some HTML output using your templates.

* Does not compile your SASS/LESS
* Does not do any image, icon or font processing
* Does not do any minification/uglifying

These tasks can be added to your own gulpfile.


[SMACSS]:https://smacss.com/
[Documented Style Sheets]:https://github.com/darcyclarke/DSS
[gulp-ssg]:https://github.com/paulwib/gulp-ssg

[npm-url]: https://npmjs.org/package/gulp-styleguide
[npm-image]: http://img.shields.io/npm/v/gulp-styleguide.svg?style=flat

[depstat-url]: https://david-dm.org/paulwib/gulp-styleguide
[depstat-image]: https://david-dm.org/paulwib/gulp-styleguide.svg?style=flat

[travis-image]: http://img.shields.io/travis/paulwib/gulp-styleguide/master.svg?style=flat
[travis-url]: https://travis-ci.org/paulwib/gulp-styleguide
