# gulp-dss

A gulp pipeline for building styleguide documentation from DSS comments in your CSS/SCSS/LESS.

## Usage

There is a prepared set of tasks you can run with:

    var styleguide = require('../styleguide');
    var options = {
        site: {
            title: 'Test Pattern Library'
        }
    };

    styleguide.setup(options);

You should now be able to run:

    gulp styleguide.build

...from your command line and have a bunch of stuff in a styleguide folder.

For development you can run a server which watches for changes and has livereload with:

    gulp styleguide.server

Look in the example directory to see a working gulpfile with templates etc.

You can also use that for ideas if you prefer to build your own pipeline.

## What this doesn't do

When making a useful re-usable gulp pipeline it's often difficult to draw a line under what it should or shouldn't do, but here's where the current line is drawn:

* Does not compile your SASS/LESS
* Does not do any image, icon or font processing
* Does not do any minification/uglifying

The general philosophy is not to do any processing of your assets. It will only extract the DSS from your CSS (or SASS or LESS) and produce some HTML output using your templates. You can add these tasks to your own gulpfile.

