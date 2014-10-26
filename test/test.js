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

        it('should parse @name', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @name Test\n */');

            stream.on('end', function() {
                expect(file.dss.blocks[0].name).to.equal('Test');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should copy @name of index to file.meta.sectionName', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @name Test\n */');

            stream.on('end', function() {
                expect(file.meta.sectionName).to.equal('Test');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should copy @name of non-index to file.meta.subsectionName', function(done) {
            var stream = styleguide.pipes.extract({});
            var index = getCssFile('test/index.css', '/**\n * @name Section Index\n */');
            var file = getCssFile('test/buttons.css', '/**\n * @name Subsection\n */');

            stream.on('end', function() {
                expect(file.meta.subsectionName).to.equal('Subsection');
                done();
            });

            stream.write(index);
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

        it('should parse @order and copy first to file.meta', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @order 1\n */');

            stream.on('end', function() {
                expect(file.meta.order).to.equal('1');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should ignore @order in anything but the first block', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @name Test\n */\n\n/**\n * @order 1\n */');

            stream.on('end', function() {
                expect(file.meta.order).to.be.an('undefined');
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

        it('should parse name, value and description from @variable', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @variable blue - Sky blue\n */\n$blue: #0000FF;\n');

            stream.on('end', function() {
                expect(file.dss.blocks[0].variable[0].name).to.equal('blue');
                expect(file.dss.blocks[0].variable[0].value).to.equal('#0000FF');
                expect(file.dss.blocks[0].variable[0].description).to.equal('Sky blue');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should parse multiple @variable into an array', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @variable blue - Sky blue\n  * @variable red\n*/\n$blue: #0000FF;\n$red: #FF0000;\n');

            stream.on('end', function() {
                expect(file.dss.blocks[0].variable[0].name).to.equal('blue');
                expect(file.dss.blocks[0].variable[0].value).to.equal('#0000FF');
                expect(file.dss.blocks[0].variable[0].description).to.equal('Sky blue');
                expect(file.dss.blocks[0].variable[1].name).to.equal('red');
                expect(file.dss.blocks[0].variable[1].value).to.equal('#FF0000');
                expect(file.dss.blocks[0].variable[1].description).to.equal('');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should ignore @variable if not defined', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @variable blue - Sky blue\n  * @variable red\n*/\n$red: #FF0000;\n');

            stream.on('end', function() {
                expect(file.dss.blocks[0].variable.length).to.equal(1);
                expect(file.dss.blocks[0].variable[0].name).to.equal('red');
                expect(file.dss.blocks[0].variable[0].value).to.equal('#FF0000');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should parse LESS @variable syntax', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @variable blue - Sky blue\n */\n@blue: #0000FF;\n');

            stream.on('end', function() {
                expect(file.dss.blocks[0].variable[0].name).to.equal('blue');
                expect(file.dss.blocks[0].variable[0].value).to.equal('#0000FF');
                expect(file.dss.blocks[0].variable[0].description).to.equal('Sky blue');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should parse @template and add it to file.meta', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @template pages/foo\n */');

            stream.on('end', function() {
                expect(file.meta.template).to.equal('pages/foo');
                done();
            });

            stream.write(file);
            stream.end();
        });

        it('should parse @partial into a lambda', function(done) {
            var stream = styleguide.pipes.extract({});
            var file = getCssFile('test/index.css', '/**\n * @partial partials/bar\n */');

            stream.on('end', function() {
                expect(file.dss.blocks[0].partial()()).to.equal('{{>partials/bar}}');
                done();
            });

            stream.write(file);
            stream.end();
        });
    });
});
