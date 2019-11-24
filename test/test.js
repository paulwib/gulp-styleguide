var fs = require('fs');
var path = require('path');
var test = require('tape');
var Vinyl = require('vinyl');
var Buffer = require('buffer').Buffer;
var extract = require('../lib/extract');

function getCssFile(path, content) {
    return new Vinyl({
        cwd: '',
        base: 'test/',
        path: path,
        contents: new Buffer.from(content)
    });
}

test('should parse @name', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @name Test\n */');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].name, 'Test');
    });

    stream.write(file);
    stream.end();
});

test('should copy @name of index to file.data.sectionName', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @name Test\n */');

    stream.on('end', function() {
        t.is(file.data.sectionName, 'Test');
    });

    stream.write(file);
    stream.end();
});

test('should copy @name of non-index to file.data.subsectionName', function(t) {
    t.plan(1);
    var stream = extract({});
    var index = getCssFile('test/index.css', '/**\n * @name Section Index\n */');
    var file = getCssFile('test/buttons.css', '/**\n * @name Subsection\n */');

    stream.on('end', function() {
        t.is(file.data.subsectionName, 'Subsection');
    });

    stream.write(index);
    stream.write(file);
    stream.end();
});

test('should convert @description to HTML', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @description Test\n */');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].description.trim(), '<p>Test</p>');
    });

    stream.write(file);
    stream.end();
});

test('should parse @order and copy first to file.data', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @order 1\n */');

    stream.on('end', function() {
        t.is(file.data.order, '1');
    });

    stream.write(file);
    stream.end();
});

test('should ignore @order in anything but the first block', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @name Test\n */\n\n/**\n * @order 1\n */');

    stream.on('end', function() {
        t.is(file.data.order, undefined);
    });

    stream.write(file);
    stream.end();
});

test('should make @state an array, even if only one', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @state .error\n */');

    stream.on('end', function() {
        t.ok(Array.isArray(file.data.dss.blocks[0].state));
    });

    stream.write(file);
    stream.end();
});

test('should add @state HTML examples, expanding variables', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @state .error\n * @markup\n * <span class="{{{escaped}}}">foo</span>\n */');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].state[0].markup.example, '<span class="error">foo</span>');
    });

    stream.write(file);
    stream.end();
});

test('should strip empty attributes from block.markup', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @state .error\n * @markup\n * <span id="foo" class="{{{escaped}}}">foo</span>\n */');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].markup.example, '<span id="foo">foo</span>');
    });

    stream.write(file);
    stream.end();
});

test('should parse name, value and description from @variable', function(t) {
    t.plan(3);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @variable blue - Sky blue\n */\n$blue: #0000FF;\n');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].variable[0].name, 'blue');
        t.is(file.data.dss.blocks[0].variable[0].value, '#0000FF');
        t.is(file.data.dss.blocks[0].variable[0].description, 'Sky blue');
    });

    stream.write(file);
    stream.end();
});

test('should parse multiple @variable into an array', function(t) {
    t.plan(6);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @variable blue - Sky blue\n  * @variable red\n*/\n$blue: #0000FF;\n$red: #FF0000;\n');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].variable[0].name, 'blue');
        t.is(file.data.dss.blocks[0].variable[0].value, '#0000FF');
        t.is(file.data.dss.blocks[0].variable[0].description, 'Sky blue');
        t.is(file.data.dss.blocks[0].variable[1].name, 'red');
        t.is(file.data.dss.blocks[0].variable[1].value, '#FF0000');
        t.is(file.data.dss.blocks[0].variable[1].description, '');
    });

    stream.write(file);
    stream.end();
});

test('should ignore @variable if not defined', function(t) {
    t.plan(3);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @variable blue - Sky blue\n  * @variable red\n*/\n$red: #FF0000;\n');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].variable.length, 1);
        t.is(file.data.dss.blocks[0].variable[0].name, 'red');
        t.is(file.data.dss.blocks[0].variable[0].value, '#FF0000');
    });

    stream.write(file);
    stream.end();
});

test('should parse LESS @variable syntax', function(t) {
    t.plan(3);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @variable blue - Sky blue\n */\n@blue: #0000FF;\n');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].variable[0].name, 'blue');
        t.is(file.data.dss.blocks[0].variable[0].value, '#0000FF');
        t.is(file.data.dss.blocks[0].variable[0].description, 'Sky blue');
    });

    stream.write(file);
    stream.end();
});

test('should parse @template and add it to file.data', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @template pages/foo\n */');

    stream.on('end', function() {
        t.is(file.data.template, 'pages/foo');
    });

    stream.write(file);
    stream.end();
});

test('should parse @partial into a lambda', function(t) {
    t.plan(1);
    var stream = extract({});
    var file = getCssFile('test/index.css', '/**\n * @partial partials/bar\n */');

    stream.on('end', function() {
        t.is(file.data.dss.blocks[0].partial()(), '{{>partials/bar}}');
    });

    stream.write(file);
    stream.end();
});
