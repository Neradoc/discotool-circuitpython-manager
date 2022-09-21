/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import * as jq from "../extlib/jquery.min.js"
import * as common from "../main/common.js"
import * as tools from "../lib/tools.js"
import * as password_dialog from "../sub/password_dialog.js"

const ws = window.moduleWS

var board_control = null
var socket = null
var password = ""

async function init_page() {

	// get the workflow connection/instance
	await common.start()
	board_control = common.board_control

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
	$("title").html(`${board_name} - ${uuid} - REPL`)

	$(document).on("click", ".board_link", (e) => {
		const link = $(e.currentTarget)
		const url = link.data("board_link")
		window.postMessage({
			type: 'open-board',
			device: url,
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
	}

	// The serial part

	var input = $("#input")
	input.val("")

	var serial_log = $("#serial_log")
	var serial_content = $("#serial_log .content")
	var bottom_scroll = $("#serial_log .bottom")

	function set_enabled(enabled) {
		input.prop("disabled", !enabled)
		var buttons = document.querySelectorAll("button")
		for (var button of buttons) {
			button.disabled = !enabled
		}
	}

	set_enabled(false)

	var heads = board_control.headers()
	var base_url = board_control.workflow_url_base.replace(/^https?:\/\//, "")
	base_url = base_url.replace(/\/$/, "")
	socket = new ws.WebSocket(
		(
			"ws://"
			+ `${board_control.username}:${board_control.password}@`
			+ base_url + "/cp/serial/"
		),
		{
			"headers": heads,
		}
	)
	
	socket.onopen = function() {
		set_enabled(true)
		$("body").removeClass("loading")
		$("body").removeClass("error")
	}

	var setting_title = false
	var encoder = new TextEncoder()
	var left_count = 0
	socket.onmessage = function(e) {
		const scroll_margin = serial_content.height() - (
			serial_log.scrollTop() + serial_log.height()
		)
		if (e.data == "\x1b]0;") {
			setting_title = true
			// start reading status thing
		} else if (e.data == "\x1b\\") {
			setting_title = false
			// finished reading status thing
		} else if (setting_title) {
			// receiving status thing
			// title.textContent += e.data
		} else if (e.data == "\b") {
			left_count += 1
		} else if (e.data == "\x1b[K") { // Clear line
			serial_content[0].textContent = serial_content[0].textContent.slice(0, -left_count)
			left_count = 0
		} else {
			serial_content[0].textContent += e.data
		}
		if(scroll_margin < 32) {
			bottom_scroll[0].scrollIntoView()
		}
	}

	socket.onclose = function() {
		set_enabled(false)
	}

	socket.onerror = function(e) {
		console.log(e)
		set_enabled(false)
		$("body").addClass("error")
	}

	input.on("keydown", function(e) {
		const info = tools.keys_info(e)
		if(info.key == "TAB" && info.modifiers == "") {
			if(input.val().length == 0) {
				input.val("\t")
			} else {
				socket.send("\t")
			}
			e.preventDefault()
			return false
		}
	})

	$(document).on("keydown", function(e) {
		const info = tools.keys_info(e)
		if(info.modifiers == "C") {
			if(info.key == "C") {
				$("#ctrlc").click()
				e.preventDefault()
				return false
			}
			if(info.key == "D") {
				$("#ctrld").click()
				e.preventDefault()
				return false
			}
		}
	})

	input.on("beforeinput", function(e) {
		var inputType = e.originalEvent.inputType
		var data = e.originalEvent.data
		if (inputType == "insertLineBreak") {
			socket.send("\r")
			input.val("")
			input.focus()
			bottom_scroll[0].scrollIntoView()
			e.preventDefault()
			return false
		} else if (inputType == "insertText" || inputType == "insertFromPaste") {
			socket.send(data)
		} else if (inputType == "deleteContentBackward") {
			socket.send("\b")
		} else {
			// console.log(e)
		}
	})

	$("#ctrlc").on("click", () => {
		$("#ctrlc").addClass("pressed")
		socket.send("\x03")
		setTimeout(() => $("#ctrlc").removeClass("pressed"), 250)
	})

	$("#ctrld").on("click", () => {
		$("#ctrld").addClass("pressed")
		socket.send("\x04")
		setTimeout(() => $("#ctrld").removeClass("pressed"), 250)
	})

	$("#serial_send_button").on("click", () => {
		socket.send("\r")
		input.val("")
		input.focus()
	})

}

init_page()
