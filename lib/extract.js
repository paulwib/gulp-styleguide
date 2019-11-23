'use strict';

var dss = require('dss');
var es = require('event-stream');
var PluginError = require('plugin-error');
var path = require('path');
var hogan = require('hogan-updated');
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
    dss.parser('partial', partialDssParser);
    dss.parser('variable', variableDssParser());

    return es.map(function(file, cb) {

        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            cb(new PluginError('gulp-styleguide',  'Streaming not supported'));
            return;
        }
        file.meta = {};
        var basename = path.basename(file.relative, path.extname(file.path));

        dss.parse(file.contents.toString('utf8'), {}, function(dss) {

            // Extract file level properties
            if (dss.blocks.length) {
                firstBlock = dss.blocks[0];
                // Get section name from index file
                if (basename === 'index') {
                    file.meta.sectionName = firstBlock.name;
                }
                // Get sub-section name from first blocks name (and delete name to avoid repetition)
                else {
                    file.meta.subsectionName = firstBlock.name;
                    delete dss.blocks[0].name;
                }
                // Extras
                ['order', 'template'].forEach(function(prop) {
                    if (firstBlock[prop]) {
                        file.meta[prop] = firstBlock[prop];
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
            file.dss = dss;
            cb(null, file);
        });
    });
}

/**
 * Get parser for a file which will extract "@variable {name} - {description}"
 *
 * @param {object} file - The file to extract the variable values from
 * @return {function} A DSS parser
 */
function variableDssParser() {

    var fileVariables = {},
        fileVariablesRx = /^[\$|@]([a-zA-Z0-9_]+):([^\;]+)\;/gim,
        lineSplitRx = /((\s|-)+)/,
        variables = {},
        match, hash, tokens, name;

    return function(i, line, block, css) {
        hash = crypto.createHash('md5').update(css).digest('hex');
        if (!fileVariables[hash]) {
            while ((match = fileVariablesRx.exec(css)) !== null) {
                variables[match[1].trim()] = match[2].trim();
            }
            fileVariables[hash] = variables;
        }

        // Extract name and any delimiter with description
        tokens = line.split(lineSplitRx, 2);
        name = tokens[0].trim();
        if (variables.hasOwnProperty(name)) {
            return {
                name: name,
                // Description is line with name and any delimiter replaced
                description: line.replace(tokens.join(''), ''),
                value: variables[name]
            };
        }
    };
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
function partialDssParser(i, line, block) {
    var partialTag = '{{>' + line + '}}';
    return function() {
        return function() {
            return partialTag;
        };
    };
}
