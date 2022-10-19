/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import {WORKFLOW_USERNAME, WORKFLOW_PASSWORD, OPEN_IN_BROWSER} from "../../config.js"
import { WebWorkflow } from "../backends/web.js"
import { USBWorkflow } from "../backends/usb.js"
import * as tools from "../lib/tools.js"

export const DEFAULT_SYSTEM_FILES = [
	".fseventsd",
	".metadata_never_index",
	".Trashes",
	".TemporaryItems",
	"System Volume Information",
]

export const is_electron = window && window.process && window.process.type == "renderer"

export var library_bundle = null
export var board_control = null
export async function start() {
	var url = new URL(window.location)
	var url_passed = url.searchParams.get("device") || ""

	if (url_passed.startsWith("file://")) {
		var target_drive = url_passed.replace(/^file:\/\//, "")
		board_control = new USBWorkflow(target_drive)
	} else if (url_passed.startsWith("ble:")) {
		console.log("BLE workflow not supported")
	} else if (url_passed.startsWith("http://")) {
		// var target_url = url_passed.replace(/^http:\/\//, "")
		board_control = new WebWorkflow(url_passed)
	}
}
export function set_library_bundle(bundle) {
	library_bundle = bundle
}

/* open helpers */

function open_outside_a(e) {
	const target = e.currentTarget
	var path = $(target).data("path")
	if(path) {
		var full_path = board_control.edit_url(path)
		tools.open_outside(full_path).then(() => {
			console.log("GO", full_path)
		})
	}
	return false
}

export function open_file_editor_a(e, more=[]) {
	if(board_control.type == "usb") {
		return open_outside_a(e)
	}
	if(board_control.type == "web" && OPEN_IN_BROWSER) {
		return open_outside_a(e)
	}
	const link = $(e.currentTarget)
	var file = ("/" + link.data("path")).replace(/\/\/+/, "/")
	board_control.get_board_url().then((url) => {
		var IPC_message = {
			type: 'open-file-editor',
			device: url,
			file: file,
		}
		if(more) {
			for(var key in more) {
				IPC_message[key] = more[key]
			}
		}
		if(board_control.supports_credentials) {
			IPC_message.password = $("#password").val()
		}
		window.postMessage(IPC_message)
	})
	return false
}

