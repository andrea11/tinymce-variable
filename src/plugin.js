"use strict";
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var tinymce = require("tinymce");
tinymce.PluginManager.add('variable', function (editor) {
    var mapper = editor.getParam('variable_mapper', {});
    var valid = editor.getParam('variable_valid', null);
    var className = editor.getParam('variable_class', 'variable');
    var prefix = editor.getParam('variable_prefix', '{{');
    var suffix = editor.getParam('variable_suffix', '}}');
    var stringVariableRegex = new RegExp(escapeRegExp(prefix) + '.*?' + escapeRegExp(suffix), 'g');
    function isValid(name) {
        if (!valid) {
            return true;
        }
        var validString = '|' + valid.join('|') + '|';
        return validString.indexOf('|' + name + '|') > -1 ? true : false;
    }
    function getMappedValue(cleanValue) {
        if (typeof mapper === 'function') {
            return mapper(cleanValue);
        }
        return mapper.hasOwnProperty(cleanValue) ? mapper[cleanValue] : cleanValue;
    }
    function cleanVariable(value) {
        return value.substring(prefix.length, value.length - suffix.length);
    }
    function createHTMLVariable(value) {
        var cleanValue = cleanVariable(value);
        if (!isValid(cleanValue)) {
            return value;
        }
        var cleanMappedValue = getMappedValue(cleanValue);
        editor.fire('variableToHTML', {
            value: value,
            cleanValue: cleanValue
        });
        var variable = prefix + cleanValue + suffix;
        return "<span class=\"" + className + "\" data-original-variable=\"" + variable + "\" contenteditable=\"false\">" + cleanMappedValue + "</span>";
    }
    function stringToHTML() {
        var nodeList = [];
        var nodeValue, node, div;
        tinymce.walk(editor.getBody(), function (n) {
            if (n && n.nodeType === 3 && n.nodeValue && stringVariableRegex.test(n.nodeValue)) {
                var noValidVariable = n.nodeValue.match(stringVariableRegex).every(function (variable) {
                    return !isValid(cleanVariable(variable));
                });
                if (!noValidVariable) {
                    nodeList.push(n);
                }
            }
        }, 'childNodes');
        nodeList.forEach(function (n) {
            nodeValue = n.nodeValue.replace(stringVariableRegex, createHTMLVariable);
            div = editor.dom.create('div', null, nodeValue);
            while ((node = div.lastChild)) {
                editor.dom.insertAfter(node, n);
                if (isVariable(node)) {
                    var next = node.nextSibling;
                    editor.selection.setCursorLocation(next);
                }
            }
            editor.dom.remove(n);
        });
    }
    function htmlToString() {
        var nodeList = [];
        var nodeValue, node, div;
        tinymce.walk(editor.getBody(), function (n) {
            if (n && n.nodeType === 1) {
                var original = n.getAttribute('data-original-variable');
                if (original !== null) {
                    nodeList.push(n);
                }
            }
        }, 'childNodes');
        nodeList.forEach(function (nodeElement) {
            nodeValue = nodeElement.getAttribute('data-original-variable');
            div = editor.dom.create('div', null, nodeValue);
            while ((node = div.lastChild)) {
                editor.dom.insertAfter(node, nodeElement);
            }
            editor.dom.remove(nodeElement);
        });
    }
    function setCursor(selector) {
        var ell = editor.dom.select(selector)[0];
        if (ell) {
            var next = ell.nextSibling;
            editor.selection.setCursorLocation(next);
        }
    }
    function handleContentRerender(e) {
        return e.format === 'raw' ? stringToHTML() : htmlToString();
    }
    function addVariable(value) {
        var htmlVariable = createHTMLVariable(value);
        editor.execCommand('mceInsertContent', false, htmlVariable);
    }
    function isVariable(element) {
        if (typeof element.getAttribute === 'function' && element.hasAttribute('data-original-variable')) {
            return true;
        }
        return false;
    }
    function handleClick(e) {
        stringToHTML();
        var target = e.target;
        if (!isVariable(target)) {
            return;
        }
        var value = target.getAttribute('data-original-variable');
        editor.fire('variableClick', {
            value: cleanVariable(value),
            target: target
        });
    }
    function handleSubmit() {
        htmlToString();
        editor.fire('submitted');
    }
    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }
    editor.on('keyup', stringToHTML);
    editor.on('init', stringToHTML);
    editor.on('submit', handleSubmit);
    editor.on('click', handleClick);
    _this.addVariable = addVariable;
});
//# sourceMappingURL=plugin.js.map