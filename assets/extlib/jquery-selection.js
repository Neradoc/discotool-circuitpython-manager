/*
SPDX-FileCopyrightText: Copyright (c) 2006 Alex Brem <alex@0xab.cd> - http://blog.0xab.cd
SPDX-License-Identifier: MIT

jQuery plugin: fieldSelection - v0.1.0 - last change: 2006-12-16
*/

import * as jq from "../extlib/jquery.min.js"

(function() {
	var fieldSelection = {

		getSelection: function() {
			var e = this.jquery ? this[0] : this;
			/* mozilla / dom 3.0 */
			if('selectionStart' in e) {
				var l = e.selectionEnd - e.selectionStart;
				return { start: e.selectionStart, end: e.selectionEnd, length: l, text: e.value.substr(e.selectionStart, l) };
			}
			/* exploder */
			else if(document.selection) {
				e.focus();
				var r = document.selection.createRange();
				if (r == null) {
					return { start: 0, end: e.value.length, length: 0 }
				}
				var re = e.createTextRange();
				var rc = re.duplicate();
				re.moveToBookmark(r.getBookmark());
				rc.setEndPoint('EndToStart', re);
				return { start: rc.text.length, end: rc.text.length + r.text.length, length: r.text.length, text: r.text };
			}
			/* browser not supported */
			else {
				return { start: 0, end: e.value.length, length: 0 };
			}
		},

		replaceSelection: function() {
			var e = this.jquery ? this[0] : this;
			var text = arguments[0] || '';
			var select = arguments[1] || false;
			/* mozilla / dom 3.0 */
			if('selectionStart' in e) {
				const start = e.selectionStart;
				e.value = e.value.substr(0, e.selectionStart) + text + e.value.substr(e.selectionEnd, e.value.length);
				// change the selection to the added text
				if(select) {
					e.selectionStart = start;
					e.selectionEnd = start + text.length;
				} else {
					e.selectionStart = start + text.length;
					e.selectionEnd = start + text.length;
				}
			}
			/* exploder */
			else if(document.selection) {
				e.focus();
				var range = document.selection.createRange();
				range.text = text;
				// change the selection to the added text
				if(!select) {
					range.collapse(false);
					range.select();
				}
			}
			/* browser not supported */
			else {
				e.value += text;
			}
			return this;
		},
		
		setSelection: function(start,end) {
			var e = this.jquery ? this[0] : this;
			if(typeof(end)=='undefined') end = start;
			/* mozilla / dom 3.0 */
			if('selectionStart' in e) {
				e.selectionStart = start;
				e.selectionEnd = end;
			}
			/* exploder */
			else if(document.selection)
			{
				e.focus();
				//range = document.selection.createRange();
				range = e.createTextRange();
				range.collapse();
				range.moveStart("character", start);
				range.moveEnd("character", end-start);
				range.select();
			}
			/* browser not supported */
			else
			{
				// do nothing
			}
			return this;
		}

	};

	jQuery.each(fieldSelection, function(i) { jQuery.fn[i] = this; });

})();
