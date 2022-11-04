/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

/*****************************************************************
* File rename dialog
*/

var callbacks = {}
var board_control = null

async function close() {
	$("#rename_dialog").data("path", "")
	$("#rename_dialog").removeClass("popup_dialog")
	$("body").removeClass("popup_dialog")
	callbacks?.close?.("close")
}
async function cancel() {
	await close()
	callbacks?.button?.("cancel")
}
async function ok() {
	$("#rename_dialog .ok_button").prop("disabled", true)
	$("#rename_dialog .cancel_button").prop("disabled", true)
	try {
		var from_path = $("#rename_dialog").data("path")
		var new_name = $("#rename_dialog .new_name").val()
		var to_path = ""
		// relative versus absolute
		var dir_path = window.modulePath.posix.dirname(from_path)
		if(new_name.startsWith("/")) {
			to_path = new_name
		} else {
			to_path = window.modulePath.posix.join(dir_path, new_name)
		}
		// try doing the rename command
		const from_path_dir = (`${from_path}/`).replace(/\/\/+/,"/")
		console.log(`Rename “${from_path}” “${to_path}” <${from_path_dir}>`)
		if(to_path.startsWith(from_path_dir)) {
			console.log("Cannot move a directory into itself.")
			$("#rename_dialog .error").show().html("Operation failed")
			return
		}
		var res = await board_control.rename_file(from_path, to_path)
		$("#rename_dialog .ok_button").prop("disabled", false)
		$("#rename_dialog .cancel_button").prop("disabled", false)
		if(res.ok) {
			await close()
			callbacks?.button?.("ok")
		} else {
			// TODO: more info on the error
			$("#rename_dialog .error").show().html("Operation failed")
		}
	} catch(e) {
		console.log(e)
	} finally {
		$("#rename_dialog .ok_button").prop("disabled", false)
		$("#rename_dialog .cancel_button").prop("disabled", false)
	}
}
async function open(e) {
	const target = e.currentTarget
	var path = $(target).data("path")
	var file_name = path.split("/").filter(Boolean).pop()
	$("#rename_dialog").data("path", path)
	// TODO: filter path for html ?
	$("#rename_dialog .error").hide().html("")
	$("#rename_dialog .ok_button").prop("disabled", false)
	$("#rename_dialog .cancel_button").prop("disabled", false)
	$("#rename_dialog .original_name").val(path)
	$("#rename_dialog .new_name").val(file_name)
	$("#rename_dialog").addClass("popup_dialog")
	$("body").addClass("popup_dialog")
	$("#rename_dialog .new_name").focus()
	return false
}
async function setup(board_ctrl, callback_list) {
	board_control = board_ctrl
	if(callback_list) {
		callbacks = callback_list
	}
	$("#rename_dialog .ok_button").on("click", ok)
	$("#rename_dialog .cancel_button").on("click", cancel)
	$("#rename_dialog .new_name").on("keydown", (e) => {
		if(e.which == 13) {
			$("#rename_dialog .ok_button").click()
			return false
		}
		return true
	})
}

export { setup, open, close, cancel, ok }
