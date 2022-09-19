/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
function replace_includes() {
	const includes = window.document.getElementsByClassName("include")
	var all_promises = []
	for(const item of includes) {
		// get the include file name
		const src = item.getAttribute("data-src")
		const source = `${src}.html`
		// get the include content
		const promise = fetch(`html/${source}`).then((response) => {
			return response.text()
		}).then( (loaded) => {
			// make it into DOM
			const dom_elts = window.document.createRange().createContextualFragment(loaded)
			// put it in
			item.replaceWith(dom_elts)
		})
		all_promises.push(promise)
	}
	// wait until all includes are loaded
	Promise.all(all_promises)
}
replace_includes()
