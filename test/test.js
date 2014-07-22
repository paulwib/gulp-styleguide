/* globals describe, it */

'use strict';

var gulp = require('gulp');
var expect = require('chai').expect;
var gutil = require('gulp-util');
var File = gutil.File;
var dss = require('../');

function getMockFile(path, content) {
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
            var stream = dss.extract();
            var file = getMockFile('scss/button.scss', '/*\n* @name Test\n*/');

            stream.on('end', function() {
                expect(file).to.have.property('dss');
                expect(file.dss).to.have.property('blocks');
                expect(file.dss.blocks).to.have.length(1);
                expect(file.dss.blocks[0]).to.have.property('name', 'Test');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should extract multiple blocks', function(done) {
            var stream = dss.extract();
            var file = getMockFile('scss/button.scss', '/*\n* @name Test\n*/\n/* @name Test 2\n*/');

            stream.on('end', function() {
                expect(file).to.have.property('dss');
                expect(file.dss).to.have.property('blocks');
                expect(file.dss.blocks).to.have.length(2);
                expect(file.dss.blocks[0]).to.have.property('name', 'Test');
                expect(file.dss.blocks[1]).to.have.property('name', 'Test 2');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should pass through plain markdown', function(done) {
            var stream = dss.extract();
            var file = getMockFile('scss/index.md', 'This is just an intro\nEvery section should have an index');

            stream.on('end', function() {
                expect(file).to.have.property('dss');
                expect(file.dss).to.have.property('blocks');
                expect(file.dss.blocks).to.have.length(0);
                done();
            });

            stream.write(file);
            stream.end();
        });
    });
});
