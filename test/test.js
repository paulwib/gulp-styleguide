'use strict';
/* globals describe, it */
var styleguide = require('../');
var expect = require('chai').expect;
var should = require('should');
var fs = require('fs');
var path = require('path');
var File = require('gulp-util').File;
var Buffer = require('buffer').Buffer;


function getCssFile(path, content) {
    return new File({
        cwd: '',
        base: 'test/',
        path: path,
        contents: new Buffer(content)
    });
}

describe('gulp-styleguide', function() {

    describe('extract()', function() {

        it('should extract @name', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @name Test\n */');

            stream.on('end', function() {
                expect(file.dss.blocks[0].name).to.equal('Test');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should convert @description to HTML', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @description Test\n */');

            stream.on('end', function() {
                expect(file.dss.blocks[0].description.trim()).to.equal('<p>Test</p>');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should make @state an array, even if only one', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @state .error\n */');

            stream.on('end', function() {
                expect(file.dss.blocks[0].state).to.be.an.instanceof(Array);
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should add @state HTML examples, expanding variables', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @state .error\n * @markup\n * <span class="{{{escaped}}}">foo</span>\n */');

            stream.on('end', function() {
                expect(file.dss.blocks[0].state[0].markup.example).to.equal('<span class="error">foo</span>');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should strip empty attributes from block.markup', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @state .error\n * @markup\n * <span id="foo" class="{{{escaped}}}">foo</span>\n */');

            stream.on('end', function() {
                expect(file.dss.blocks[0].markup.example).to.equal('<span id="foo">foo</span>');
                done();
            });

            stream.write(file);
            stream.end();
        });
    });
});
