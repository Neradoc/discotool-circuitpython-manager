/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import * as jq from "../extlib/jquery.min.js"
import * as common from "../main/common.js"
import * as tools from "../lib/tools.js"
import * as password_dialog from "../sub/password_dialog.js"

var target_file = null
var password = ""
var board_control = null
var last_saved = 0
var saved_timer = null

const SAVED_DELAY = 10000
const TAB_REPLACE = "    "
const TAB_AT_LINE = /^(\t| {1,4})/

function update_saved() {
	const now = new Date()
	const delta = (now - last_saved) / 1000 / 60
	const minutes = Math.floor(delta)
	$(".last_saved").html(minutes)
}

async function init_page() {

	/* get the workflow connection/instance
	- from a common pool setup somewhere ?
	- from the main process, via preload ?
	- create another one ?
		- that's not gonna work for BLE ?
	- have a factory class that
		- creates new ones if necessary
		- returns the existing one if it exists
		- (using unique identifiers http://IP | file://DRIVE ...
	*/
	await common.start()
	board_control = common.board_control
	await board_control.start()

	// setup the password
	var window_url = new URL(window.location)
	if(board_control.supports_credentials) {
		// password was passed from the parent window
		password = window_url.searchParams.get("password") || null
		await password_dialog.setup(board_control, undefined, password)
	}

	// setup page information
	var vinfo = await board_control.device_info()
	var board_url = await board_control.get_board_url()
	var uuid = await board_control.get_identifier()
	var board_name = vinfo.board_name

	$(".board_name").html(board_name)
	$(".board_link").prop("href", `?dev=${board_url}`)
	$(".board_link").data("board_link", board_url)
	$(`header .icon_${board_control.type}`).show()

	$(document).on("click", ".board_link", (e) => {
		const link = $(e.currentTarget)
		const url = link.data("board_link")
		window.postMessage({
			type: 'open-board',
			device: url,
		})
		return false
	})

	var text_block = $("textarea#editor_content")

	/* get the file path from the URL parameters
	- all in one parameter ?
		- file:///Volumes/CIRCUITPY/code.py
		- http://192.168.1.1/fs/code.py
	*/

	target_file = window_url.searchParams.get("file") || ""
	if(target_file[0] != "/") {
		target_file = "/" + target_file
	}
	$(".file_name").html(target_file)

	$("title").html(`${board_name} - ${uuid} - ${target_file}`)

	saved_timer = setInterval(update_saved, SAVED_DELAY)

	/* auto install dependencies */
	$(".auto_install_button").on("click", (e) => {
		window.postMessage({
			type: 'open-board',
			device: board_url,
			install: {
				file: target_file,
			}
		})
		return false
	})

	/* check the modifiable state
	- display a lock and disable saving
	- check and update it periodically (5s ?)
	*/

	if(await board_control.is_editable()) {
		$("body").addClass("board_editable")
		$("body").removeClass("board_locked")
	} else {
		$("body").addClass("board_locked")
		$("body").removeClass("board_editable")
		$(".save_button").prop("disabled", true)
	}

	// setup code mirror

	const CM = window.codemirror

	var syntaxHighLight = CM.language.syntaxHighlighting(
		CM.language.defaultHighlightStyle
	)

	const fixedHeightEditor = CM.view.EditorView.theme({
		"&": { flex: "1" },
		".cm-scroller": { overflow: "auto" },
	}, {
		dark: true,
	})

	// better insert tab, using TAB_REPLACE
	function insertTab({ state, dispatch }) {
		if (state.selection.ranges.some(r => !r.empty)) {
			return CM.commands.indentMore({ state, dispatch })
		}
		dispatch(state.update(state.replaceSelection(TAB_REPLACE), {
			scrollIntoView: true,
			userEvent: "input"
		}))
		return true
	}

	// disable fricking horrible "lineWiseCopyCut" nonsense
	function copyNotEmpty({ state, dispatch }) {
		if (state.selection.ranges.some(r => !r.empty)) {
			return false
		}
		return true
	}

	let startState = CM.state.EditorState.create({
		doc: "",
		extensions: [
			CM.language.indentUnit.of(TAB_REPLACE),
			CM.view.keymap.of(CM.commands.defaultKeymap),
			CM.view.keymap.of(CM.commands.historyKeymap),
			CM.view.keymap.of(CM.search.searchKeymap),
			// CM.view.keymap.of([CM.commands.indentWithTab]),
			CM.view.keymap.of([
				{
					key: "Tab",
					run: insertTab, // CM.commands.insertTab,
					shift: CM.commands.indentLess,
				},
				{
					key: "Mod-t",
					run: CM.commands.toggleComment,
				},
				{
					key: "Mod-4", // '
					run: CM.commands.toggleComment,
				},
				{
					key: "Mod-c",
					run: copyNotEmpty,
				},
				{
					key: "Mod-x",
					run: copyNotEmpty,
				},
			]),
			CM.python(),
			CM.search.search({ top: true }),
			CM.view.lineNumbers(),
			CM.view.EditorView.lineWrapping,
			CM.commands.history(),
			CM.view.drawSelection(),
			syntaxHighLight,
			fixedHeightEditor,
		]
	})

	let view = new CM.view.EditorView({
		state: startState,
		parent: $(".cm-editor")[0],
	})

	var transaction = view.state.update({
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: "This is a view",
		}
	})

	// setup the save command/path (probably only needs the same path)

	var saving_now = false
	$(".save_button").on("click", async (e) => {
		if(saving_now) { return }
		if(!await board_control.is_editable()) { return }
		saving_now = true
		$(".save_button").prop("disabled", true)
		$(".buttons_1").addClass("saving")
		try {
			// var new_content = text_block.val()
			var new_content = await view.state.doc.toString()
			var new_content_blob = new Blob([new_content], { type: 'text/plain' })
			var save_path = target_file
			var res = await board_control.upload_file(save_path, new_content_blob)
			if(res.ok) {
				last_saved = new Date()
				update_saved()
			} else {
				console.log(res)
			}
		} finally {
			await tools.sleep(2)
			$(".buttons_1").removeClass("saving")
			$(".save_button").prop("disabled", false)
			saving_now = false
		}
	})

	// setup the editor with the file's content

	async function setup_editor_content() {
		const result = await board_control.get_file_content(target_file)
		if(result.ok) {
			var file_content = result.textContent()
			// text_block.val(file_content)
			view.dispatch(view.state.update({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: file_content,
				}
			}))
			//
			// setup_lines()
			last_saved = new Date()
			$(".last_saved").html(0)
			return true
		}
		return result.status
	}

	function do_setup_editor_content() {
		return setup_editor_content().then((res) => {
			if(res === 409) {
				password_dialog.open({
					"close": do_setup_editor_content,
				})
			}
			if(res === 404) {
				// TODO
			}
		})
	}

	$(document).on("keydown", function(e) {
		const info = tools.keys_info(e)
		if(["C", "M"].includes(info.modifiers)) {
			if(info.key == "S") {
				$(".save_button").click()
				e.preventDefault()
				return false
			}
		}
	})

	window.addEventListener("opened-editor", (event) => {
		var line_num = event?.detail?.line
		console.log(event, line_num)
		console.log(view)
		if(line_num !== undefined) {
			// hightlight line line_num
			const line = view.state.doc.line(line_num)
			view.dispatch({
				selection: {
					anchor: line.from,
					head: line.to,
				},
				scrollIntoView: true,
			})
			view.focus()
		}
	})

	do_setup_editor_content().then(() => {
		window.dispatchEvent(new Event('finished-starting'))
	})
}

init_page()
