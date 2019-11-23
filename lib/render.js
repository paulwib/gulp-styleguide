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
        if (file.meta.template) {
            templateName = file.meta.template;
        }
        else if (file.meta.isIndex) {
            templateName = 'pages/index';
        }
        else {
            templateName = 'pages/default';
        }
        if (!templates.hasOwnProperty(templateName)) {
            cb(new PluginError('gulp-styleguide', 'Template "' + templateName + '" missing'));
        }
        else {
            var html = templates[templateName].render({
                meta: file.meta,
                dss: file.dss,
                site: site
            }, templates);

            file.contents = new Buffer(html);
            cb(null, file);
        }
    });
}
