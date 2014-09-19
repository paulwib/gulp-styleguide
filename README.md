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

## Options

TODO

## TODO

* Why can't I use the actual name from the DSS in the menu? We're using file.meta.name. We should use
  file.dss.blocks[0].name - but the problem is we're not guaranteed it will be there, so need to normalize
  somehow. Also there could be multiple blocks, so how do you pick the names? I guess by convention there
  could be one block per file? That won't always be the case and should be flexible enough to handle multiples.

  I guess we need some kind of normalize step. Also we could attach DSS props to meta instead. Or we could
  attach meta to DSS? But yeah, need a normalize step for extracting the title from the first block.
  Or we add a special title processor and use that?

  Also we could have a specific sectionTitle to cover this.

  But also may have YAML front-matter as well.

  And how do we extract the sectionTitle?

  Assigning to DSS doesn't work as there's a hard-coded property name in gulp-ssg. That's a bug.

  Having a normalize step doesn't work as this has to be done for all files before the index is
  built.

  We can't extract stuff either as far as I recall.

  Ah wait, just do this in the extract function first.

  But then still no way to have a main section title separate from the name. I guess we could extract that?

  Yep, taking the first block name and assigning to title, then subsequent blocks will have a lower title.

  It would be good to add @section and @section-title to each dss file. That would be clean and unambiguous.

  Or, because and index.md file is required for gulp-ssg, we require that and put the section and title in
  the front-matter.

  Hm...so I copy the first blocks name to file.meta.name and then delete it. That seems a bit risky.
  Would be much better to have a clear convention for how you identify the section and the title.

  And there can only be one section per file I think. Then in gulp-ssg we can sort on section.

* Filter out files that contain nothing useful, like a main.scss
  There is a gulp-filter for this kind of thing, but not sure how well that fits as uses glob
  patterns, whereas we may want to check whether it contains any blocks or not. In the grunt-styleguide
  I use blocks in main.scss just to break things up. But with dss we're using the folder structure,
  so this isn't needed so much. So yeah let's just ignore `main`.

  Having trouble writing that into the glob.

* Add options documentation
* Add better default templates, and a way to switch templates
* Add a way to extract an ordering from files
* Maybe gulp-ssg needs a way to set what page to use for the index?
