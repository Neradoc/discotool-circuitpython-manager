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
	var title = document.querySelector("title")
	var serial_log = $("#serial_log")[0]

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
	console.log(base_url)
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
	
	console.log(socket)

	socket.onopen = function() {
		console.log("open")
		set_enabled(true)
		$("body").removeClass("loading")
		$("body").removeClass("error")
	}

	var setting_title = false
	var encoder = new TextEncoder()
	var left_count = 0
	socket.onmessage = function(e) {
		console.log("message", e)
		if (e.data == "\x1b]0;") {
			setting_title = true
			title.textContent = ""
		} else if (e.data == "\x1b\\") {
			setting_title = false
		} else if (setting_title) {
			title.textContent += e.data
		} else if (e.data == "\b") {
			left_count += 1
		} else if (e.data == "\x1b[K") { // Clear line
			serial_log.textContent = serial_log.textContent.slice(0, -left_count)
			left_count = 0
		} else {
			serial_log.textContent += e.data
		}
		document.querySelector("span").scrollIntoView()
	}

	socket.onclose = function() {
		console.log("close")
		set_enabled(false)
	}

	socket.onerror = function(e) {
		console.log("error", e)
		set_enabled(false)
		$("body").addClass("error")
	}

	input.on("keydown", function(e) {
		var TABKEY = 9
		if(e.keyCode == TABKEY) {
			if(input.val().length == 0) {
				input.val("\t")
			} else {
				socket.send("\t")
			}
			e.preventDefault()
			return false
		}
	})

	input.on("beforeinput", function(e) {
		var inputType = e.originalEvent.inputType
		var data = e.originalEvent.data
		console.log("BFI", inputType, data)
		if (inputType == "insertLineBreak") {
			socket.send("\r")
			input.val("")
			input.focus()
			e.preventDefault()
			return false
		} else if (inputType == "insertText" || inputType == "insertFromPaste") {
			socket.send(data)
		} else if (inputType == "deleteContentBackward") {
			socket.send("\b")
		} else {
			console.log(e)
		}
	})

	$("#ctrlc").on("click", () => {
		console.log("CTRL-C")
		socket.send("\x03")
	})

	$("#ctrld").on("click", () => {
		console.log("CTRL-D")
		socket.send("\x04")
	})

	$("#serial_send_button").on("click", () => {
		console.log("send")
		socket.send("\r")
		input.val("")
		input.focus()
	})

}

init_page()

