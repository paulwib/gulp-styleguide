/* globals describe, it */

'use strict';

var gulp = require('gulp');
var expect = require('chai').expect;
var gutil = require('gulp-util');
var File = gutil.File;
var dss = require('../');

function getCssFile(path, content) {
    return new File({
        cwd: '',
        base: 'test/',
        path: path,
        contents: new Buffer(content)
    });
}

describe('gulp-dss', function() {

    describe('in buffer mode', function() {

        it('should extract the dss data', function(done) {
            var stream = dss();
            var file = getCssFile('scss/button.md', '/*\n* @name Test\n*/');

            stream.on('end', function() {
                expect(file).to.have.property('dss');
                done();
            });

            stream.write(file);
            stream.end();
        });
    });
});
