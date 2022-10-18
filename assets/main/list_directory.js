/*
SPDX-FileCopyrightText: Copyright (c) Scott Shawcroft for Adafruit
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
import { OPEN_IN_BROWSER } from "../../config.js"
import * as common from "../main/common.js"
import * as tools from "../lib/tools.js"
import * as password_dialog from "../sub/password_dialog.js"
import * as files_progress_dialog from "../sub/files_progress_dialog.js"

const SECRETS = [
	".env",
	"secrets.py",
]
const HIDE = {
	"NOTHING": 0,
	"DEFAULT_SYSTEM_FILES": 1,
	"ALL_SYSTEM_FILES": 2,
	"ALL_DOTTED_FILES": 3,
}
const IGNORE_UPLOAD = [
	".DS_Store",
	/^\._.*/,
]

var USE_TRIANGLES = false

var current_path = tools.current_path
var refreshing = false
var settings = {
	show_system_files: false,
	sort_directories_first: false,
	show_list_triangles: USE_TRIANGLES,
}
var triangles = new Set()

function _icon(name, cls="") {
	return `<img src="assets/svg/${name}.svg" class="${cls}" />`
}

/*****************************************************************
* Parse error messages
*/

async function get_error_message(response, message) {
	const status = await response.status
	const error = await response.statusText
	var error_message = ""
	switch(status) {
	case 401:
		error_message = `${message}: Bad password !`
		break
	case 403:
		error_message = `${message}: Not authorized !`
		break
	case 409:
		error_message = `${message}: Drive read-only !`
		break
	default:
		error_message = `${message}: ${error} !`
	}
	return error_message
}

/*****************************************************************
* Create or refresh the list of files
*/

async function insert_files_list(current_list_path, list_depth="") {
	var response = await common.board_control.list_dir(current_list_path)

	if (! response.ok) {
		$('#file_list_error').show()
		$('#file_list_body tr').remove()
		const message = `Directory listing failed`
		var error_message = await get_error_message(response, message)
		$("#file_list_error_label").html(error_message)
		//
		if(response.status == 401) {
			await password_dialog.open()
		}
		return
	}

	var dir_files_list = response.content
	var new_children = []
	var template = $('#file_list_template')

	var link = $("#file_list .go_back_up")
	if (current_list_path != "/") {
		if(list_depth == "") {
			const parent = new URL("..", "file://" + current_list_path)
			link.prop("href", tools.url_here({"path": parent.pathname}))
			link.show()
		}
	} else {
		link.hide()
	}

	if(settings.sort_directories_first) {
		dir_files_list.sort((a,b) => {
			if(a.directory != b.directory) {
				return a.directory ? -1 : 1
			}
			return a.name.localeCompare(b.name)
		})
	} else {
		dir_files_list.sort((a,b) => {
			return a.name.localeCompare(b.name)
		})
	}

	const num_files = dir_files_list.length
	for (const file_pos in dir_files_list) {
		var file_info = dir_files_list[file_pos]
		// Clone the new row and insert it into the table
		var clone = template.clone()
		clone.prop("id", "")
		var td = clone.find("td")
		var file_path = current_list_path + file_info.name
		// TODO: this is backend-specific
		// -> make the backend cooperate with this to get the "direct reference"
		// for web workflow it is currently the direct URL, though it should
		// not remain so in the future.
		let api_url = common.board_control.api_url(file_path)
		if (file_info.directory) {
			file_path += "/"
			api_url += "/"
		}
		const ext_icons = [
			[["txt"], _icon("file-text")],
			[["py"], _icon("file-code-py")],
			[["js", "json"], _icon("file-code-curl")],
			[["html", "html"], _icon("file-code-html")],
			[["mpy"], _icon("adafruit_blinka_angles-right")],
			[["jpg", "jpeg", "png", "bmp", "gif"], _icon("picture")],
			[["wav", "mp3", "ogg"], _icon("file-music")],
		]
		var hide_level = settings.show_system_files ? HIDE.NOTHING : HIDE.ALL_SYSTEM_FILES
		var is_secret = false;
		var icon = _icon("file-unknown")
		if (current_list_path == "/" && SECRETS.includes(file_info.name)) {
			is_secret = true
			icon = _icon("key")
		} else if (current_list_path == "/" && common.DEFAULT_SYSTEM_FILES.includes(file_info.name)) {
			// hidden names in root
			if(file_info.directory) {
				icon = _icon("folder-no")
			} else {
				icon = _icon("file-no")
			}
			if(hide_level >= HIDE.DEFAULT_SYSTEM_FILES) continue
		} else if (file_info.name.startsWith("._")) {
			icon = _icon("apple")
			if(hide_level >= HIDE.ALL_SYSTEM_FILES) continue
		} else if (file_info.name.startsWith(".")) {
			icon = _icon("file-invisible")
			if(hide_level >= HIDE.ALL_DOTTED_FILES) continue
		} else if (current_list_path == "/" && file_info.name == "lib") {
			icon = _icon("folder-lib")
		} else if (current_list_path == "/" && file_info.name == "boot_out.txt") {
			icon = _icon("file-info") // info-circle
		} else if (file_info.directory) {
			icon = _icon("folder")
		} else {
			for(const file_dat of ext_icons) {
				const ext = file_info.name.split(".").pop()
				if(file_dat[0].includes(ext)) {
					icon = file_dat[1]
					break
				}
			}
		}
		td[0].innerHTML = icon

		if(file_info.directory) {
			if(settings.show_list_triangles) {
				var dbutton = $("<a class='triangle'/>")
				dbutton.data("path", file_path)
				if(triangles.has(file_path)) {
					dbutton.html(_icon("triangle-down"))
				} else {
					dbutton.html(_icon("triangle-right"))
				}
				dbutton.on("click", open_triangle)
				$(td[1]).append(dbutton)
			} else {
				td[1].innerHTML = "-"
			}
		} else {
			td[1].innerHTML = file_info.file_size
		}

		var path = clone.find("a.path")
		path.html(file_info.name)
		path.data("path", file_path)
		if(file_info.directory) {
			path.attr("href", tools.url_here({"path": `${file_path}`}))
			path.addClass("files_list_dir")
		} else {
			path.attr("href", api_url)
			if(is_secret) {
				path.on("click", open_secret)
			} else {
				path.on("click", common.open_file_editor_a)
			}
		}

		if(settings.show_list_triangles && list_depth) {
			var prepend = $(td[2]).find(".prepend")
			prepend.append(list_depth)
			if(file_pos < num_files - 1) {
				prepend.append(_icon("dash-cornervertical", "dash"))
			} else {
				prepend.append(_icon("dash-corner", "dash"))
			}
			var depth_length = list_depth.match(/<img/g)?.length || 0
			path.css("padding-left", `${(depth_length) * 20 + 9}px`)
		}

		$(td[3]).html((new Date(file_info.modified)).toLocaleString())
		var delete_button = clone.find(".delete")
		delete_button.data("path", file_path)
		delete_button.val(file_path)
		delete_button.on("click", delete_a_file)

		var edit_button = clone.find(".edit")
		edit_button.data("path", file_path)
		if(file_info.directory) {
			edit_button.remove()
		} else {
			edit_button.attr("href", api_url)
			edit_button.on("click", common.open_file_editor_a)
		}

		var rename_button = clone.find(".rename")
		rename_button.data("path", file_path)
		rename_button.attr("href", api_url)
		rename_button.on("click", rename_dialog_open)

		var analyze_button = clone.find(".analyze")
		if(file_info.name.endsWith(".py")) {  // || search("requirement") >= 0 ?
			analyze_button.data("path", file_path)
			analyze_button.val(api_url)
		} else {
			analyze_button.hide()
		}

		new_children.push(clone)

		if(settings.show_list_triangles && file_info.directory && triangles.has(file_path)) {
			var sub_list = list_depth
			if(list_depth == "") {
				sub_list = _icon("dash-spacer", "dash-spacer")
			} else {
				if(file_pos < num_files - 1) {
					sub_list += _icon("dash-vertical", "dash")
				} else {
					sub_list += _icon("dash-spacer", "dash")
				}
			}
			var sub_list = await insert_files_list(file_path, sub_list)
			new_children = new_children.concat(sub_list)
		}
	}
	return new_children
}
async function refresh_list() {
	if (refreshing) {
		return
	}
	refreshing = true
	try {
		var top = Math.floor($('#file_list_list').height() / 2 - $('#file_list_loading_image').height() / 2)
		$('#file_list_loading_image').css("top", `${top}px`)
		$('#file_list_loading_image').show()
		$('#file_list_error').hide()
		$('#file_list_list').addClass("loading")

		if (current_path == "") {
			current_path = "/"
		}

		var drive_name = common.board_control.drive_name || "CIRCUITPY"
		var pwd = $('#pwd .dir_path')
		var pwd_link = `<a class="files_list_dir dir" href="?path=/#files" data-path="/">${drive_name}</a>/`
		var fullpath = "/"
		for(var path of current_path.split("/")) {
			if(path != "") {
				fullpath += path + "/"
				pwd_link += `<a href="?path=${fullpath}#files" data-path="${fullpath}" class="dir files_list_dir">${path}</a>/`
			}
		}
		pwd.html(pwd_link)

		const new_children = await insert_files_list(current_path)

		$("#file_list_body tr").remove()
		$("#file_list_body").append(new_children)

		$('#file_list_loading_image').hide()
	} catch(e) {
		console.log(e)
	} finally {
		refreshing = false
		$('#file_list_loading_image').hide()
		$('#file_list_list').removeClass("loading")
	}
}

/*****************************************************************
* Create directory
*/

async function mkdir(e) {
	var mkdir_button = $("#mkdir")
	var dir_path = current_path + $("#new_directory_name").val() + "/"
	var response = await common.board_control.create_dir(dir_path)
	if (response.ok) {
		refresh_list()
		$("#new_directory_name").val("")
		mkdir_button.prop("disabled", true)
	}
}

/*****************************************************************
* Upload file
*/

async function upload_files_action(e) {
	window.postMessage({
		"type": 'open-multiples-dialog',
		"return_event": 'upload-files-from-dialog',
		"sender": window.location.toString(),
	})
}

async function upload_files_to(source_files, target_path) {
	const fs = window.moduleFss
	const path = window.modulePath

	for(var file_path of source_files) {
		var stat = fs.statSync(file_path)
		var file_size = stat.size
		if(file_size < 1000) {
			file_size = `${file_size} B`
		} else if(file_size < 1000000) {
			file_size = `${(file_size/1000).toFixed(1)} kB`
		} else {
			file_size = `${(file_size/1000000).toFixed(1)} MB`
		}
		var file_name = path.basename(file_path)
		var sub_target = path.join(target_path, file_name)

		var do_skip = false
		for(var pattern of IGNORE_UPLOAD) {
			if(file_name.match(pattern)) {
				do_skip = true
				break
			}
		}
		if(do_skip) continue

		if(stat.isDirectory()) {
			await files_progress_dialog.log(`<c class="right">Creating:</c><c> ${sub_target}/</c>`)
			var response = await common.board_control.create_dir(sub_target)
			var subdir = fs.opendirSync(file_path)
			for await (const dirent of subdir) {
				var sub_file = path.join(file_path, dirent.name)
				await upload_files_to([sub_file], sub_target)
			}
		} else {
			await files_progress_dialog.log(`<c class="right">Uploading:</c><c> ${sub_target} (${file_size})</c>`)
			var file_data = fs.readFileSync(file_path)
			var response = await common.board_control.upload_file(sub_target, file_data)
		}
	}
}

async function upload_files_from_dialog(event) {
	if(event?.detail?.sender != window.location.toString()) return
	const fs = window.moduleFss
	const path = window.modulePath

	files_progress_dialog.open({}, {
		title: "Uploading Files",
		description: `Files uploaded to the board.`,
	})
	try {
		var source_files = event?.detail?.source_files
		await upload_files_to(source_files, current_path)
	} catch(e) {
		console.log(e)
	}
	await files_progress_dialog.log("Upload finished.")
	await files_progress_dialog.enable_buttons()
	refresh_list()
}


/*****************************************************************
* Delete file
*/

async function delete_a_file(e) {
	var path = $(this).data("path")
	console.log("Delete", path)
	var prompt = `Delete ${path}`
	if (path.endsWith("/")) {
		prompt += " and all of its contents?"
	} else {
		prompt += "?"
	}
	if (confirm(prompt)) {
		var response = await common.board_control.delete_file(path)
		if (response.ok) {
			refresh_list()
		} else {
			const message = `Deleting ${fn.pathname.substr(3)} failed`
			const status = await response.status
			const error = await response.statusText
			switch(status) {
			case 401:
				console.log(`${message}: Bad password !`)
				break
			case 403:
				console.log(`${message}: Not authorized !`)
				break
			case 409:
				console.log(`${message}: Drive read-only !`)
				break
			default:
				console.log(`${message}: ${error} !`)
			}
		}
	}
	return false
}

/*****************************************************************
* Open a triangle directory
*/

function open_triangle(e) {
	var self = $(e.currentTarget)
	const file_path = self.data("path")
	if(triangles.has(file_path)) {
		triangles.delete(file_path)
	} else {
		triangles.add(file_path)
	}
	refresh_list()
	return false
}

/*****************************************************************
* Open secret file
*/

function open_secret(e) {
	var path = $(this).data("path")
	var prompt = `The file: "${path}"\ncan contain readable passwords.\nAre you sure you want to open it ?`
	if (confirm(prompt)) {
		common.open_file_editor_a(e)
	}
	return false
}

/*****************************************************************
* Load a directory in the page without refreshing the window
*/

function load_directory(e) {
	var self = $(e.currentTarget)
	current_path = self.data("path")
	window.history.pushState({}, '', tools.url_here({'path': current_path}))
	refresh_list()
	return false
}

/*****************************************************************
* File rename dialog
*/

function rename_dialog_close() {
	$("#rename_dialog").data("path", "")
	$("#rename_dialog").removeClass("popup_dialog")
	$("body").removeClass("popup_dialog")
}
function rename_dialog_open(e) {
	const target = e.currentTarget
	var path = $(target).data("path")
	$("#rename_dialog").data("path", path)
	// TODO: filter path for html ?
	$("#rename_dialog .error").hide().html("")
	$("#rename_dialog .ok_button").prop("disabled", false)
	$("#rename_dialog .cancel_button").prop("disabled", false)
	$("#rename_dialog .original_name").val(path)
	$("#rename_dialog .new_name").val(path)
	$("#rename_dialog").addClass("popup_dialog")
	$("body").addClass("popup_dialog")
	$("#rename_dialog .new_name").focus()
	return false
}
function rename_dialog_ok() {
	$("#rename_dialog .ok_button").prop("disabled", true)
	$("#rename_dialog .cancel_button").prop("disabled", true)
	try {
		var from_path = $("#rename_dialog").data("path")
		var to_path = $("#rename_dialog .new_name").val()
		// try doing the rename command
		const from_path_dir = (`${from_path}/`).replace(/\/\/+/,"/")
		console.log(`Rename “${from_path}” “${to_path}” <${from_path_dir}>`)
		if(to_path.startsWith(from_path_dir)) {
			console.log("Cannot move a directory into itself.")
			$("#rename_dialog .error").show().html("Operation failed")
			return
		}
		common.board_control.rename_file(from_path, to_path).then((res) => {
			$("#rename_dialog .ok_button").prop("disabled", false)
			$("#rename_dialog .cancel_button").prop("disabled", false)
			if(res.ok) {
				rename_dialog_close()
				refresh_list()
			} else {
				// TODO: more info on the error
				$("#rename_dialog .error").show().html("Operation failed")
			}
		})
	} catch(e) {
		console.log(e)
	} finally {
		$("#rename_dialog .ok_button").prop("disabled", false)
		$("#rename_dialog .cancel_button").prop("disabled", false)
	}
}
async function setup_rename_dialog() {
	$("#rename_dialog .ok_button").on("click", rename_dialog_ok)
	$("#rename_dialog .cancel_button").on("click", rename_dialog_close)
	$("#rename_dialog .new_name").on("keydown", (e) => {
		if(e.which == 13) {
			$("#rename_dialog .ok_button").click()
			return false
		}
		return true
	})
}

/*****************************************************************
* Startup
*/

async function setup_directory() {
	// settings
	const check_settings = [
		"show_system_files",
		"sort_directories_first",
		"show_list_triangles"
	]
	for(const setting of check_settings) {
		settings[setting] = localStorage.getItem(setting, false) == "1"
		$(`.file_list_setup_buttons input[name="${setting}"]`).prop(
			"checked", settings[setting]
		)
		const setter = setting
		$(`.file_list_setup_buttons input[name="${setter}"]`).on("change", (e) => {
			settings[setter] = $(e.currentTarget).prop("checked")
			localStorage.setItem(setter, settings[setter] ? "1" : "0")
			refresh_list()
		})
	}
	// settings.show_list_triangles = localStorage.getItem("show_list_triangles", false) == "1"

	// upload from electron
	let upload_files_button = $("#upload_files_button")
	upload_files_button.on("click", upload_files_action)

	// make directory
	let mkdir_button = document.getElementById("mkdir")
	mkdir_button.onclick = mkdir
	mkdir_button.disabled = $("#new_directory_name").val().length == 0

	// setup other buttons and things
	$("#new_directory_name").on("input", () => {
		mkdir_button.disabled = $("#new_directory_name").val().length == 0
	})

	$(document).on("click", ".refresh_list", (e) => {
		refresh_list()
	})
	$(document).on("click", "#file_list .files_list_dir", load_directory)

	// setup dialogs
	if(common.board_control.supports_credentials) {
		await password_dialog.setup(common.board_control, { "button": refresh_list })
	}
	await setup_rename_dialog()
	
	// setup closing dialogs with escape
	$(document).on("keydown", (e) => {
		if(e.which == 27 && $("body").is(".popup_dialog")) {
			if($("#password_dialog").is(".popup_dialog")) {
				password_dialog.close()
			}
			if($("#rename_dialog").is(".popup_dialog")) {
				rename_dialog_close()
			}
			return false
		}
		return true;
	});

	$(".file_list_setup_buttons .unroll").on("click", (e) => {
		$(".file_list_setup_buttons").toggleClass("unrolled")
		return false
	})

	window.addEventListener("upload-files-from-dialog", (event) => {
		upload_files_from_dialog(event)
	})
}

export { setup_directory, refresh_list }
