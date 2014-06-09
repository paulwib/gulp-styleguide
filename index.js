'use strict';

var through = require('through');
var gutil = require('gulp-util');
var es = require('event-stream');
var PluginError = gutil.PluginError;
var File = gutil.File;
var dss = require('dss');

/**
 * Parse DSS content of CSS and attach to file object
 */
module.exports = function() {

    return es.map(function(file, cb) {
        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            return this.emit('error', new PluginError('gulp-ssg',  'Streaming not supported'));
        }
        dss.parse(file.contents.toString(), {}, function(dssParsed) {
            file.dss = dssParsed;
            cb(null, file);
        });
    });
};
