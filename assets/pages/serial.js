/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import { OPEN_IN_BROWSER } from "../../config.js"
import * as jq from "../extlib/jquery.min.js"
import * as common from "../main/common.js"
import * as tools from "../lib/tools.js"
import * as password_dialog from "../sub/password_dialog.js"

const ws = window.moduleWS

var board_control = null
var socket = null
var password = ""

var input_history = []
var input_line = ""

function push_history(item) {
	item = item.trim()
	if(item == "") return
	var history_panel = $("#history_panel")
	var pos = -1
	while( (pos = input_history.indexOf(item)) >= 0) {
		input_history.splice(pos,pos)
	}
	input_history.push(item)
	history_panel.children().remove()
	for(var index in input_history) {
		var command = input_history[index]
		var option = $('<div class="history_line">')
		option.data("command", index)
		option.html(command.substr(0,64).escapeHTML())
		history_panel.append(option)
	}
	if(input_history.length == 0) {
		$("#history_button").prop("disabled", true)
		$("#history_panel").hide()
	} else {
		$("#history_button").prop("disabled", false)
	}
}

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
		$("button").prop("disabled", !enabled)
		$("#history_button").prop("disabled", input_history.length == 0)
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
		input.focus()
	}

	function set_the_serial_content(the_data) {
		the_data = the_data.replace(
			/(\s+)(https?:\/\/\S+)(\s+)/g,
			`$1<a class="outside_link"
				href="$2"
			>$2</a>$3`
		).replace(
			/ImportError: (no module named '(\S+)')/g,
			`ImportError: <a class="circup_link"
				data-board_link="${board_url}"
				data-module="$2"
				href="?dev=${board_url}&install=$2"
			>$1</a>`
		).replace(
			/File "([^"]+)", line (\d+)/g,
			(match, p1, p2, offset, string, groups) => {
				// don't link to "stdin"
				if(p1 == "<stdin>") return match
				return `<a class="file_link"
					data-board_link="${board_url}"
					data-path="${p1}"
					data-line="${p2}"
					href="?dev=${board_url}"
				>File "${p1}", line ${p2}</a>`
			}
		).replace(/\n$/, "") // somehow there's a return added at the end ?
		serial_content.html(the_data)
	}

	var setting_title = false
	var encoder = new TextEncoder()
	var left_count = 0
	socket.onmessage = function(e) {
		const scroll_top = serial_log.scrollTop()
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
			var the_data = serial_content.text().slice(0, -left_count)
			left_count = 0
			set_the_serial_content(the_data)
		} else {
			var the_data = (serial_content.text() + e.data.escapeHTML())
			set_the_serial_content(the_data)
		}
		if(scroll_margin < 32) {
			bottom_scroll[0].scrollIntoView()
		} else {
			serial_log.scrollTop(scroll_top)
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
		$("#history_panel").hide()
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

	var mod_is_ctrl = ! window.moduleOS.platform().includes("darwin")
	var command_modifiers = (mod_is_ctrl ? "CS" : "C")

	function control_keys(letter) {
		return String.fromCharCode(letter.charCodeAt(0) - "A".charCodeAt(0) + 1)
	}

	$(document).on("keydown", function(e) {
		const info = tools.keys_info(e)
		
		if(info.modifiers == command_modifiers) {
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
			if("A B E F".includes(info.key)) {
				socket.send(control_keys(info.key))
				e.preventDefault()
				return false
			}
		} else if(info.modifiers == "") {
			input.focus()
			return true
		}
	})

	input.on("beforeinput", function(e) {
		var inputType = e.originalEvent.inputType
		var data = e.originalEvent.data
		if (inputType == "insertLineBreak") {
			push_history(input_line)
			input_line = ""
			socket.send("\r")
			input.val("")
			input.focus()
			bottom_scroll[0].scrollIntoView()
			e.preventDefault()
			return false
		} else if (inputType == "insertText" || inputType == "insertFromPaste") {
			input_line += data
			socket.send(data)
		} else if (inputType == "deleteContentBackward") {
			input_line = input_line.substr(0,-1)
			socket.send("\b")
		} else {
			// console.log(e)
		}
	})

	$("#ctrlc").on("click", () => {
		$("#ctrlc").addClass("pressed")
		socket.send(control_keys("C"))
		setTimeout(() => $("#ctrlc").removeClass("pressed"), 250)
	})

	$("#ctrld").on("click", () => {
		$("#ctrld").addClass("pressed")
		socket.send(control_keys("D"))
		setTimeout(() => $("#ctrld").removeClass("pressed"), 250)
	})

	$("#serial_send_button").on("click", () => {
		socket.send("\r")
		input.val("")
		input.focus()
	})

	$(document).on("click", ".circup_link", (e) => {
		const link = $(e.currentTarget)
		const url = link.data("board_link")
		const module = link.data("module")
		window.postMessage({
			type: 'open-board',
			device: url,
			install: {
				modules: [ module ],
			}
		})
		return false
	})

	$(document).on("click", ".file_link", (e) => {
		try {
			var line = $(e.currentTarget).data("line")
			common.open_file_editor_a(e, { line: line })
		} catch(error) {
			console.log(error)
		}
		return false
	})

	$(document).on("click", ".outside_link", (e) => {
		e.preventDefault()
		try {
			tools.open_outside(e)
		} catch(error) {
			console.log(error)
		}
		return false
	})

	$("#history_button").on("click", (e) => {
		$("#history_panel").toggle()
	})

	$(document).on("click", "#history_panel .history_line", (e) => {
		$("#history_panel").hide()
		var line = $(e.currentTarget)
		var index = line.data("command")
		var command = input_history[index]
		input.val(command)
		socket.send(command)
	})

	input.focus()
	window.dispatchEvent(new Event('finished-starting'))
}

init_page()
