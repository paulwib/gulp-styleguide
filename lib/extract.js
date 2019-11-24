'use strict';

var dss = require('dss');
var dssVariableParser = require('dss-parser-variable');
var es = require('event-stream');
var PluginError = require('plugin-error');
var path = require('path');
var hogan = require('hogan.js');
var markdown = require('marked');
var crypto = require('crypto');

module.exports = extract;

/**
 * Pipe for extracting DSS and adding to the file's properties
 *
 * @return {stream}
 */
function extract() {

    var template, firstBlock;

    // Add parsers
    dss.parser('order', function(i, line) { return line; });
    dss.parser('template', function(i, line, block) { return line; });
    dss.parser('partial', dssPartialParser);
    dss.parser('variable', dssVariableParser());

    return es.map(function(file, cb) {

        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            cb(new PluginError('gulp-styleguide',  'Streaming not supported'));
            return;
        }
        if (!file.data) file.data = {};
        var basename = path.basename(file.relative, path.extname(file.path));

        dss.parse(file.contents.toString('utf8'), {}, function(dss) {

            // Extract file level properties
            if (dss.blocks.length) {
                firstBlock = dss.blocks[0];
                // Get section name from index file
                if (basename === 'index') {
                    file.data.isIndex = true;
                    file.data.sectionName = firstBlock.name;
                }
                // Get sub-section name from first blocks name (and delete name to avoid repetition)
                else {
                    file.data.subsectionName = firstBlock.name;
                    delete dss.blocks[0].name;
                }
                // Extras
                ['order', 'template'].forEach(function(prop) {
                    if (firstBlock[prop]) {
                        file.data[prop] = firstBlock[prop];
                        delete firstBlock[prop];
                    }
                });
            }

            // Massaging block data
            dss.blocks.forEach(function(block) {
                // Convert description from markdown to HTML
                if (block.hasOwnProperty('description')) {
                    block.description = markdown(String(block.description));
                }
                // Normalize @state and @variable to array
                ['state', 'variable'].forEach(function(prop) {
                    if (block.hasOwnProperty(prop) && typeof block[prop].slice !== 'function') {
                        block[prop] = [block[prop]];
                    }
                });
                // Add state examples
                if (block.hasOwnProperty('state') && block.hasOwnProperty('markup')) {
                    template = hogan.compile(block.markup.example);
                    block.markup.example = template.render({}).replace(/\s?[a-z]+="\s*"/gi, '');
                    block.markup.escaped = block.markup.example.replace(/</g, '&lt;').replace(/>/g, '&gt;');

                    block.state.forEach(function(state) {
                        state.markup = {
                            example: template.render(state),
                            escaped: template.render(state).replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        };
                    });
                }
            });
            file.data.dss = dss;
            cb(null, file);
        });
    });
}

/**
 * Parser to extract "@partial" and add a lambda to the block so you can use that
 * partial in the template for the block with {{#partial}}{{/partial}} (because
 * there is no such thing as variable partial names in Mustache)
 *
 * @param {number} i - Block number
 * @param {string} line - Text after "@partial"
 * @param {string} block - Entire DSS block
 */
function dssPartialParser(i, line, block) {
    var partialTag = '{{>' + line + '}}';
    return function() {
        return function() {
            return partialTag;
        };
    };
}
