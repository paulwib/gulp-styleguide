# gulp-dss

A task for building styleguide documentation from DSS comments in your CSS/SCSS/LESS.

## Usage

There is a prepared task you can run with:

    require('gulp-dss').task();

You should now be able to run `gulp dss` from your command line and have a bunch of stuff in a styleguide folder.

You can also use individual bits and pieces to make your own task. Have a look in task.js for ideas.

The only gulp module this provides is a simple wrapper around DSS. Everything else is done with other gulp modules which you are free to use or ignore as you like :)

## Options

You can pass options to the task like

    require('gulp-dss').task(options);

Available options are:

* src - pattern to match source CSS files, default is `scss/**/.scss`
* dest - where to output the styleguide, default is `styleguide/`
* taskName - set a name for the task, default is `dss`

---

## TODO

* Convert the files to markdown
* Convert the files to HTML
* Generate examples, one for each state if neccessary
* Handle multiple blocks nicely
* Wrap them all in a mini-site, possibly using gulp-ssg

