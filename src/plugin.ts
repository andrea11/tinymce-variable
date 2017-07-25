/**
 * plugin.js
 *
 * Copyright, BuboBox
 * Released under MIT License.
 *
 * License: https://www.bubobox.com
 * Contributing: https://www.bubobox.com/contributing
 */

import * as tinymce from 'tinymce';

tinymce.PluginManager.add('variable', editor => {
	/**
	 * Object that is used to replace the variable string to be used
	 * in the HTML view
	 * @type {object}
	 */
	const mapper: { [key: string]: string } = editor.getParam('variable_mapper', {} as any) as any;

	/**
	 * define a list of variables that are allowed
	 * if the variable is not in the list it will not be automatically converterd
	 * by default no validation is done
	 * @todo  make it possible to pass in a function to be used a callback for validation
	 * @type {array}
	 */
	const valid: string[] = editor.getParam('variable_valid', null) as any;

	/**
	 * Get custom variable class name
	 * @type {string}
	 */
	const className = editor.getParam('variable_class', 'variable');

	/**
	 * Prefix and suffix to use to mark a variable
	 * @type {string}
	 */
	const prefix = editor.getParam('variable_prefix', '{{');
	const suffix = editor.getParam('variable_suffix', '}}');
	const stringVariableRegex = new RegExp(escapeRegExp(prefix) + '.*?' + escapeRegExp(suffix), 'g');

	/**
	 * check if a certain variable is valid
	 * @param {string} name
	 * @return {bool}
	 */
	function isValid(name: string): boolean {

		if (!valid) {
			return true;
		}

		const validString = '|' + valid.join('|') + '|';
		return validString.indexOf('|' + name + '|') > -1 ? true : false;
	}

	function getMappedValue(cleanValue: string): string {
		if (typeof mapper === 'function') {
			return mapper(cleanValue);
		}

		return mapper.hasOwnProperty(cleanValue) ? mapper[cleanValue] : cleanValue;
	}

	/**
	 * Strip variable to keep the plain variable string
	 * @example "{test}" => "test"
	 * @param {string} value
	 * @return {string}
	 */
	function cleanVariable(value: string): string {
		return value.substring(prefix.length, value.length - suffix.length);
	}

	/**
	 * convert a text variable "x" to a span with the needed
	 * attributes to style it with CSS
	 * @param  {string} value
	 * @return {string}
	 */
	function createHTMLVariable(value: string): string {

		const cleanValue = cleanVariable(value);

		// check if variable is valid
		if (!isValid(cleanValue)) {
			return value;
		}
		const cleanMappedValue = getMappedValue(cleanValue);

		editor.fire('variableToHTML', {
			value: value,
			cleanValue: cleanValue
		});

		const variable = prefix + cleanValue + suffix;
		return `<span class="${className}" data-original-variable="${variable}" contenteditable="false">${cleanMappedValue}</span>`;
	}

	/**
	 * convert variable strings into html elements
	 * @return {void}
	 */
	function stringToHTML(): void {
		const nodeList: Element[] = [];
		let nodeValue: string,
			node: Element,
			div: Element;

		// find nodes that contain a string variable
		tinymce.walk(editor.getBody(), (n?: Element) => {
			if (n && n.nodeType === 3 && n.nodeValue && stringVariableRegex.test(n.nodeValue)) {
				const noValidVariable = n.nodeValue.match(stringVariableRegex).every(variable => {
					return !isValid(cleanVariable(variable));
				});
				if (!noValidVariable) {
					nodeList.push(n);
				}
			}
		}, 'childNodes');
		// loop over all nodes that contain a string variable
		nodeList.forEach(n => {
			nodeValue = n.nodeValue.replace(stringVariableRegex, createHTMLVariable);
			div = editor.dom.create('div', null, nodeValue);
			while ((node = div.lastChild as Element)) {


				editor.dom.insertAfter(node, n);

				if (isVariable(node)) {
					const next = node.nextSibling;
					editor.selection.setCursorLocation(next as any);
				}
			}

			editor.dom.remove(n as any);
		})
	}

	/**
	 * convert HTML variables back into their original string format
	 * for example when a user opens source view
	 * @return {void}
	 */
	function htmlToString(): void {
		const nodeList: Element[] = [];
		let nodeValue: string,
			node: Element,
			div: Element;
		// find nodes that contain a HTML variable
		tinymce.walk(editor.getBody(), (n?: Element) => {
			if (n && n.nodeType === 1) {
				const original = n.getAttribute('data-original-variable');
				if (original !== null) {
					nodeList.push(n);
				}
			}
		}, 'childNodes');

		// loop over all nodes that contain a HTML variable
		nodeList.forEach(nodeElement => {
			nodeValue = nodeElement.getAttribute('data-original-variable');
			div = editor.dom.create('div', null, nodeValue);
			while ((node = div.lastChild as Element)) {
				editor.dom.insertAfter(node, nodeElement);
			}

			// remove HTML variable node
			// because we now have an text representation of the variable
			editor.dom.remove(nodeElement as any);

		});

	}

	function setCursor(selector: string): void {
		const ell = editor.dom.select<Element>(selector)[0];
		if (ell) {
			const next = ell.nextSibling;
			editor.selection.setCursorLocation(next as any);
		}
	}

	/**
	 * handle formatting the content of the editor based on
	 * the current format. For example if a user switches to source view and back
	 * @param  {object} e
	 * @return {void}
	 */
	function handleContentRerender(e: any): void {
		// store cursor location
		return e.format === 'raw' ? stringToHTML() : htmlToString();
		// restore cursor location
	}

	/**
	 * insert a variable into the editor at the current cursor location
	 * @param {string} value
	 * @return {void}
	 */
	function addVariable(value: string): void {
		const htmlVariable = createHTMLVariable(value);
		editor.execCommand('mceInsertContent', false, htmlVariable);
	}

	function isVariable(element: Element): boolean {
		if (typeof element.getAttribute === 'function' && element.hasAttribute('data-original-variable')) {
			return true;
		}

		return false;
	}

	/**
	 * Trigger special event when user clicks on a variable
	 * @return {void}
	 */
	function handleClick(e: MouseEvent): void {
		stringToHTML();
		const target: Element = e.target as any;

		if (!isVariable(target)) {
			return;
		}

		const value = target.getAttribute('data-original-variable');
		editor.fire('variableClick', {
			value: cleanVariable(value),
			target: target
		});
	}

	function handleSubmit(): void {
		htmlToString();
		editor.fire('submitted');
	}

	function escapeRegExp(str: string): string {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
	}

	editor.on('keyup', stringToHTML);
	editor.on('init', stringToHTML);
	// editor.on('beforegetcontent', handleContentRerender);
	editor.on('submit', handleSubmit);
	editor.on('click', handleClick);

	this.addVariable = addVariable;

});
