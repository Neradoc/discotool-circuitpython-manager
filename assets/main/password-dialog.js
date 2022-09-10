/*
SPDX-FileCopyrightText: Copyright (c) Scott Shawcroft for Adafruit
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
import * as common from "./common.js"
import * as tools from "../lib/tools.js"

var callbacks = {}

async function close() {
	$("#password_dialog").removeClass("popup_dialog")
	$("body").removeClass("popup_dialog")
	$("#password").data("backup", "")
	callbacks?.close?.("close")
}
async function open() {
	$("#password_dialog").addClass("popup_dialog")
	$("body").addClass("popup_dialog")
	$("#password").data("backup", $("#password").val())
}
async function ok() {
	var info = await common.board_control.device_info()
	const serial_num = info["serial_num"]
	const password_key = `insecure_password_${serial_num}`
	const password = $("#password").val()
	common.board_control.set_credentials(undefined, password)
	if($("#password_dialog #remember_password").is(":checked")) {
		if(serial_num) localStorage[password_key] = password
	} else {
		if(serial_num) delete localStorage[password_key]
	}
	close()
	callbacks?.button?.("ok")
}
async function cancel() {
	var info = await common.board_control.device_info()
	const serial_num = info["serial_num"]
	const password_key = `insecure_password_${serial_num}`
	$("#password").val($("#password").data("backup"))
	if(password_key in localStorage) {
		$("#password_dialog #remember_password").prop("checked", true)
	} else {
		$("#password_dialog #remember_password").prop("checked", false)
	}
	close()
	callbacks?.button?.("cancel")
}
async function setup(callback_list) {
	if(callback_list) {
		callbacks = callback_list
	}
	var info = await common.board_control.device_info()
	const serial_num = info["serial_num"]
	const password_key = `insecure_password_${serial_num}`
	$("#password_dialog .ok_button").on("click", ok)
	$("#password_dialog .cancel_button").on("click", cancel)
	$("#password_dialog #password").on("keypress", (e) => {
		if(e.which == 13) {
			$("#password_dialog .ok_button").click()
			return false
		}
		return true
	})
	if(serial_num) {
		if(password_key in localStorage) {
			const pass_mem = localStorage[password_key]
			common.board_control.set_credentials(undefined, pass_mem)
			$("#password").val(common.board_control.get_password())
			$("#password_dialog #remember_password").prop("checked", true)
		}
	}
	$(".show_password_dialog").on("click", open)
}

export { setup, open, close, ok, cancel }
