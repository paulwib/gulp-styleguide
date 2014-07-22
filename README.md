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

For development you can run a preview server which watches for changes and has livereload with:

    gulp styleguide.preview

Look in the example directory to see a working gulpfile with templates etc.

You can also use that for ideas if you prefer to build your own pipeline. 


## Options

TODO

## TODO

* Add better default templates
* Add SCSS -> CSS conversion to example (or maybe build into guide? probably not)
