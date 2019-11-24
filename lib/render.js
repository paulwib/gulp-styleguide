'use strict';

var es = require('event-stream');
var PluginError = require('plugin-error');

module.exports = render;

/**
 * Pipe for rendering templates with data
 *
 * @param {object} site - The full content tree
 * @param {object} templates - Compiled mustache templates
 * @return {stream}
 */
function render(site, templates) {

    return es.map(function(file, cb) {

        var templateName;

        if (file.isNull()) {
            return;
        }
        if (file.isStream()) {
            cb(new PluginError('gulp-styleguide',  'Streaming not supported'));
            return;
        }
        if (file.data.template) {
            templateName = file.data.template;
        }
        else if (file.data.isIndex) {
            templateName = 'pages/index';
        }
        else {
            templateName = 'pages/default';
        }
        if (!templates.hasOwnProperty(templateName)) {
            cb(new PluginError('gulp-styleguide', 'Template "' + templateName + '" missing'));
        }
        else {
            var html = templates[templateName].render({ file, site }, templates);
            file.contents = new Buffer.from(html);
            cb(null, file);
        }
    });
}
