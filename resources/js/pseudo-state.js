/**
 * Copy pseudo rules to pseudo classes like :hover to .pseudo-class-hover
 * This allows showing examples of state which would otherwise require interaction.
 */
(function(context) {

    'use strict';

    var stylesheet, rule, selector, newSelector,
        stylesheets = context.document.styleSheets,
        pseudoRegex = /\:(hover|focus|disabled|active|visited)/gi,
        selectorReplace = function(match) {
            return '.pseudo-class-' + match.substr(1);
        };

    for (var i=0; i < stylesheets.length; i++) {
        stylesheet = stylesheets[i];
        if (!stylesheet.cssRules.length) {
            continue;
        }

        for (var j=0; j < stylesheet.cssRules.length; j++) {
            rule = stylesheet.cssRules[j];

            // Skip non-CSS rules or those that don't contain pseudo-classes
            if (rule.type !== context.CSSRule.STYLE_RULE || !pseudoRegex.test(rule.selectorText)) {
                continue;
            }

            // Replace pseudo classes in each rule
            selector = rule.selectorText;
            newSelector = selector.replace(pseudoRegex, selectorReplace);

            // Apply new selector to existing rule to get full cssText without regex messyness
            rule.selectorText = newSelector;

            // Insert new rule into parent stylesheet just after the existing rule (so as not to break the cascade)
            rule.parentStyleSheet.insertRule(rule.cssText, j+1);

            // Put back the original selector text so original rule not broken
            rule.selectorText = selector;
        }
    }
})(window);
