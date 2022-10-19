/*
SPDX-FileCopyrightText: Copyright (c) Scott Shawcroft for Adafruit
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

var callbacks = {}
var board_control = null
var current_password = null

async function get_password() {
	return await board_control.get_password()
}
async function close() {
	$("#password_dialog").removeClass("popup_dialog")
	$("body").removeClass("popup_dialog")
	callbacks?.close?.("close")
}
async function open(callback_list) {
	if(callback_list) {
		Object.assign(callbacks, callback_list)
	}
	$("#password_dialog").addClass("popup_dialog")
	$("body").addClass("popup_dialog")
	$("#password").val(current_password)
}
async function ok() {
	var info = await board_control.device_info()
	const serial_num = info["serial_num"]
	const password_key = `insecure_password_${serial_num}`
	const password = $("#password").val()
	current_password = password
	board_control.set_credentials(undefined, password)
	if($("#password_dialog #remember_password").is(":checked")) {
		if(serial_num) localStorage[password_key] = password
	} else {
		if(serial_num) delete localStorage[password_key]
	}
	close()
	callbacks?.button?.("ok")
}
async function cancel() {
	var info = await board_control.device_info()
	const serial_num = info["serial_num"]
	const password_key = `insecure_password_${serial_num}`
	$("#password").val(board_control.get_password())
	if(password_key in localStorage) {
		$("#password_dialog #remember_password").prop("checked", true)
	} else {
		$("#password_dialog #remember_password").prop("checked", false)
	}
	close()
	callbacks?.button?.("cancel")
}
async function setup(board_ctrl, callback_list, password=undefined) {
	board_control = board_ctrl
	if(callback_list) {
		callbacks = callback_list
	}
	var info = await board_control.device_info()
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
	if(password) {
		board_control.set_credentials(undefined, password)
		current_password = password
		$("#password").val(password)
	} else if(serial_num) {
		if(password_key in localStorage) {
			const pass_mem = localStorage[password_key]
			board_control.set_credentials(undefined, pass_mem)
			password = board_control.get_password()
			current_password = password
			$("#password").val(password)
			$("#password_dialog #remember_password").prop("checked", true)
		}
	}
	$(".show_password_dialog").on("click", open)
}

export { setup, open, close, ok, cancel }
