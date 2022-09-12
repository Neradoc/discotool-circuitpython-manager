/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import * as jq from "../extlib/jquery.min.js";
import * as common from "./common.js";
import * as tools from "../lib/tools.js";
import * as password_dialog from "./password_dialog.js"

var target_file = null
var password = ""
var board_control = null
var last_saved = 0
var saved_timer = null
const SAVED_DELAY = 10000

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

	// setup the password
	var window_url = new URL(window.location);
	if(board_control.supports_credentials) {
		password = window_url.searchParams.get("password") || "";
		$("#password").val(password)
		board_control.set_credentials(null, password)
		await password_dialog.setup()
	}

	// setup page information
	var vinfo = await board_control.device_info()
	var board_url = await board_control.get_board_url()
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

	/* get the file path from the URL parameters
	- all in one parameter ?
		- file:///Volumes/CIRCUITPY/code.py
		- http://192.168.1.1/fs/code.py
	*/

	target_file = window_url.searchParams.get("file") || "";
	$(".file_name").html(target_file)

	$("title").html(`${target_file} - ${board_url} - ${board_name}`)

	saved_timer = setInterval(update_saved, SAVED_DELAY)

	// setup the save command/path (probably only needs the same path)

	var saving_now = false;
	$(".save_button").on("click", async (e) => {
		if(saving_now) { return }
		saving_now = true
		$(".save_button").prop("disabled", true)
		$(".save_block").addClass("saving")
		try {
			var new_content = $("#editor_content textarea").val()
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
			$(".save_block").removeClass("saving")
			$(".save_button").prop("disabled", false)
			saving_now = false
		}
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

	// setup the editor with the file's content

	async function setup_editor_content() {
		const result = await board_control.get_file_content(target_file)
		if(result.ok) {
			var file_content = result.content
			$("#editor_content textarea").val(file_content)
			last_saved = new Date()
			$(".last_saved").html(0)
			return true
		}
		return false
	}
	function do_setup_editor_content() {
		setup_editor_content().then((res) => {
			if(res === false) {
				password_dialog.open().then(() => {
					do_setup_editor_content()
				})
			}
		})
	}
	do_setup_editor_content()
}

init_page();
