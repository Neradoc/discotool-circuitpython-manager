/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import { BUNDLE_ACCESS, OPEN_IN_BROWSER } from "../../config.js"
import * as common from "../main/common.js"
import * as tools from "../lib/tools.js"
import { setup_directory, refresh_list } from "../main/list_directory.js"
import { LibraryBundle } from "../lib/bundle.js"
import { Circup } from "../lib/circup.js"
import * as bundler from "../main/bundler_select.js"
import * as files_progress_dialog from "../sub/files_progress_dialog.js"

// import { $ } from "../extlib/jquery.min.js"
const CODE_FILES = ["code.txt", "code.py", "main.py", "main.txt"]

var board_control = null
var circup = null

const DEBUG = tools.DEBUG
const LINE_HIDE_DELAY = 800
var LOADING_IMAGE = ""
var modules_to_update = []
var cpver = null
var install_running = false
var show_up_to_date = false
var is_editable = false
var redo_install_button_callback = null

function _icon(name) {
	return `<img src="assets/svg/${name}.svg" />`
}

async function start_circup() {
	if (circup == null) {
		// 1 - setup the board control as selected if not already
		// get the version data
		cpver = await board_control.cp_version()
		// 2 - setup the library bundle with the version from the board
		// init circup with the CP version
		if(common.is_electron) {
			common.set_library_bundle(new LibraryBundle(null, cpver[0]))
		} else {
			common.set_library_bundle(new LibraryBundle(BUNDLE_ACCESS, cpver[0]))
		}
		await common.library_bundle.setup_the_modules_list()
		// 3 - setup the circup updates manager for the actions
		circup = new Circup(common.library_bundle, board_control)
		await circup.start()
	}
}

/*****************************************************************
* Open link in the browser or other
*/

function open_outside_a(e) {
	const target = e.currentTarget
	var path = $(target).data("path")
	if(path) {
		var full_path = common.board_control.edit_url(path)
		tools.open_outside(full_path).then(() => {
			console.log("GO", full_path)
		})
	}
	return false
}

/*****************************************************************
* Open the serial panel
*/

function open_serial_panel(e) {
	if(common.board_control.type == "web" && OPEN_IN_BROWSER) {
		return open_outside_a(e)
	}
	const link = $(e.currentTarget)
	var file = link.data("path")
	common.board_control.get_board_url().then((url) => {
		var IPC_message = {
			type: 'open-serial-panel',
			device: url,
			file: file,
		}
		if(common.board_control.supports_credentials) {
			IPC_message.password = $("#password").val()
		}
		window.postMessage(IPC_message)
	})
	e.preventDefault()
	return false
}

/*****************************************************************
* Install all button
*/

async function install_all() {
	$(".install_buttons").prop("disabled", true)
	var modules = Array.from(modules_to_update)
	for (var line of $("#circup_page tr.line")) {
		var button = $(line).find(".upload button")
		var module_name = button.val()
		if(modules.includes(module_name)) {
			await upload_button_call({ "currentTarget":button })
		}
	}
	$(".install_buttons").prop("disabled", !is_editable)
	await update_circup_table()
}

/*****************************************************************
* Etc
*/

function dont_need_update(module_name) {
	const index = modules_to_update.indexOf(module_name)
	if (index > -1) {
		modules_to_update.splice(index, 1)
	}
}

function make_odd_even(lines) {
	lines.odd().addClass("odd").removeClass("even")
	lines.even().addClass("even").removeClass("odd")
}

async function update_circup_table() {
	var head_time = LINE_HIDE_DELAY
	const mod_lines = $('#circup_row_list .line')
	const theads = $("#dependencies table thead")
	const n_modules = mod_lines.length
	if (n_modules == 0) {
		head_time = 0
	}
	if (show_up_to_date) {
		$("#show_updates").hide()
		$("#hide_updates").show()
		$('#circup_row_list .module_exists').show(LINE_HIDE_DELAY)
	} else {
		$("#show_updates").show()
		$("#hide_updates").hide()
		$('#circup_row_list .module_exists').hide(LINE_HIDE_DELAY)
	}
	if (show_up_to_date) {
		if (n_modules > 0) {
			await theads.show(head_time).promise()
		} else {
			await theads.hide(head_time).promise()
		}
		make_odd_even(mod_lines)
	} else {
		if(modules_to_update.length > 0) {
			await theads.show(head_time).promise()
		} else {
			await theads.hide(head_time).promise()
		}
		make_odd_even(mod_lines.not(".module_exists"))
	}
	if(modules_to_update.length == 0) {
		$("#circup_page thead").addClass("module_exists")
	} else {
		$("#circup_page thead").removeClass("module_exists")
	}
	if(modules_to_update.length == 0 && n_modules > 0) {
		$("#circup_page .all_up_to_date").show()
		$("#circup_page .loading").hide()
	}
	if(n_modules == 0) {
		$("#circup_page .no_dependency_found").show()
	}
}

async function pre_update_process() {
	$("#circup_page .hide").hide()
	$("#dependencies table #circup_row_list tr").remove()
	// setup circup
	$("#circup_page .loading").html(`Loading library bundles...`).show()
}

async function update_line(new_line, board_libs) {
	var module_name = new_line.find(".upload button").val()
	var module = common.library_bundle.get_module(module_name)
	new_line.find(".status_icon").html(LOADING_IMAGE)
	new_line.removeClass("bad_mpy_module new_module invalid_module module_exists major_update_module update_module")
	// module versions from the board
	var version = await circup.get_module_version(module_name, board_libs)
	if(version && version != circup.BAD_MPY) {
		new_line.find(".board_version").html(version)
	}
	if(version === circup.BAD_MPY) {
		// bad mpy file
		new_line.addClass("bad_mpy_module")
		new_line.find(".status_icon").html(_icon("sign-stop"))
		new_line.find(".status").html("Bad MPY Format")
	} else if(version === null) {
		// no file
		new_line.addClass("new_module")
		new_line.find(".status_icon").html(_icon("sign-alert"))
		new_line.find(".status").html("Missing Module")
	} else if(version === false) {
		// invalid file, replace
		new_line.addClass("invalid_module")
		new_line.find(".status_icon").html(_icon("sign-stop"))
		new_line.find(".status").html("Module Invalid")
	} else if(module.version == version) {
		// no need to update
		new_line.addClass("module_exists")
		new_line.find(".status_icon").html(_icon("sign-check"))
		new_line.find(".status").html("Up To Date")
		dont_need_update(module_name)
	} else if(module.version[0] != version[0]) {
		// this is a major update
		new_line.addClass("major_update_module")
		new_line.find(".status_icon").html(_icon("sign-exclame-double"))
		new_line.find(".status").html("Major Update")
	} else {
		// this is a normal update
		new_line.addClass("update_module")
		new_line.find(".status_icon").html(_icon("sign-exclame"))
		new_line.find(".status").html("Update Available")
	}
	new_line.find(".upload button").prop("disabled", !is_editable)
}

async function upload_button_call(e) {
	var button = $(e.currentTarget)
	var target_module = button.val()
	var line = button.parents("tr.line")
	button.prop("disabled", true)
	line.find(".status_icon").html(LOADING_IMAGE)
	await circup.install_modules([target_module])
	await refresh_list()
	var board_libs = await board_control.get_lib_directory()
	await update_line(line, board_libs)
	await update_circup_table()
	button.prop("disabled", !is_editable)
}

async function run_update_process(imports) {
	$("#circup_page .loading").append(`<br/>Loading dependencies...`)
	// list the libs, to know which are missing
	var board_libs = await board_control.get_lib_directory()
	// get the dependencies
	var dependencies = []
	common.library_bundle.get_dependencies(imports, dependencies)
	// list them
	dependencies.sort()

	if (!DEBUG) {
		$("#circup_page .loading").hide()
	}
	$("#circup_page .title").show()
	$("#circup_page #button_install_all").prop("disabled", true)
	$("#circup_page .buttons").show()
	$("#dependencies table thead").show()

	modules_to_update = Array.from(dependencies)

	var new_lines = []
	for(var dependency of dependencies) {
		var module = common.library_bundle.get_module(dependency)
		var file_name = module.name + (module.package ? "" : ".mpy")
		var icon = module.package ? "&#128193;" : "&#128196;"
		var new_line = $("#circup_row_template").clone(); // clone the template
		new_line.prop("id", "")
		new_line.find(".upload button").on("click", upload_button_call)
		new_line.find(".upload button").val(dependency)
		new_line.find(".icon").html(icon)
		new_line.find(".name").html(dependency)
		new_line.find(".bundle_version").html(module.version)
		new_line.find(".board_version").html("...")
		if (imports.includes(dependency)) {
			new_line.addClass("imported")
		}
		$("#dependencies #circup_row_list").append(new_line)
		new_lines.push(new_line)
	}
	for(var new_line of new_lines) {
		await update_line(new_line, board_libs)
	}
	await update_circup_table()
	$("#circup_page #button_install_all").prop("disabled", !is_editable)
	$("#circup_page #circup_row_list .install").prop("disabled", !is_editable)
}

async function auto_install(file_name) {
	// TODO: wait until the bundle and board are inited
	await pre_update_process()
	$("#circup_page .loading").append(`<br/>Loading <b>${file_name}</b>...`)
	$("#circup_page .title .filename").html(`${file_name}`)
	// get the file
	var code_response = await board_control.get_file_content("/" + file_name)
	if(!code_response.ok) {
		$("#circup_page .loading").html(`No such file: <b>${file_name}</b>`)
		return false
	}
	$(".tab_link_circup").click()
	// get the list
	const code_content = code_response.content
	$("#circup_page .loading").append(`<br/>Loading modules from <b>${file_name}</b>...`)
	const imports = common.library_bundle.get_imports_from_python(code_content)
	// do the thing
	redo_install_button_callback = () => { auto_install(file_name) }
	await run_update_process(imports)
	return true
}

async function update_all() {
	// TODO: wait until the bundle and board are inited
	await pre_update_process()
	$("#circup_page .loading").append(`<br/>Loading libraries from <b>/lib</b> directory...`)
	$("#circup_page .title .filename").html("/lib/")
	$(".tab_link_circup").click()
	// get the list of libraries from the board
	var libs_list = await board_control.get_lib_modules()
	// do the thing
	redo_install_button_callback = update_all
	await run_update_process(libs_list)
	// TODO: update circup table ?
}

async function bundle_install() {
	// get the list of libraries to install
	var libs_list = bundler.modules_list
	// should we do the thing ?
	if(libs_list.length > 0) {
		$(".tab_link_circup").click()
		// start
		await pre_update_process()
		$("#circup_page .loading").append(`<br/>Loading libraries selected from the bundles...`)
		$("#circup_page .title .filename").html("selected bundle modules")
		redo_install_button_callback = bundle_install
		// do the thing
		await run_update_process(libs_list)
	}
}

async function install_a_module(libs_list) {
	// should we do the thing ?
	if(libs_list.length > 0) {
		$(".tab_link_circup").click()
		// start
		await pre_update_process()
		const modules_names = libs_list.join(", ")
		$("#circup_page .loading").append(`<br/>Loading dependencies for module <b>${modules_names}</b>.`)
		$("#circup_page .title .filename").html(modules_names)
		redo_install_button_callback = bundle_install
		// do the thing
		await run_update_process(libs_list)
	}
}

/*****************************************************************
* download a backup of all the files
*/

const SKIP = common.DEFAULT_SYSTEM_FILES.map((x) => `/${x}`).concat(["/lib"])

async function download_all() {
	// file save dialog
	window.postMessage({
		"type": 'open-directory-dialog',
		"return_event": 'save-from-directory-dialog',
		"sender": window.location.toString(),
	})
}

async function download_all_event(event) {
	if(event?.detail?.sender != window.location.toString()) return
	var dir_path = event?.detail?.dir_path
	// make the dir name
	const vinfo = await board_control.device_info()
	const uuid = vinfo.serial_num || await board_control.get_identifier()
	const date_str = (new Date()).toISOString().replace(/:/g,"-")
	var save_name = `${date_str}-${vinfo.board_name}-${uuid}`
	var save_path = `${dir_path}/${save_name}`
	// progress window
	files_progress_dialog.open({}, {
		title: "Download All",
		description: `Board files downloaded to <b>${save_path}</b>`,
		has_cancel: false,
	})
	await window.moduleFs.mkdir(save_path, {recursive: true})
	// download all the files, skipping system files and lib
	var dir_path = "/"
	var dir_paths = ["/"]
	var drill = true
	while(drill) {
		var result = await board_control.list_dir(dir_path)
		if(!result.ok) { break }
		var files_list = result.content
		for(var file_ref of files_list) {
			var file_path = `${dir_path}/${file_ref.name}`.replace(/\/+/, "/")
			if(SKIP.includes(file_path)) continue
			var file_size = file_ref.file_size
			if(file_size < 1000) {
				file_size = `${file_size} B`
			} else if(file_size < 1000000) {
				file_size = `${(file_size/1000).toFixed(1)} kB`
			} else {
				file_size = `${(file_size/1000000).toFixed(1)} MB`
			}
			if(file_ref.directory) {
				dir_paths.unshift(file_path)
				var target_path = save_path + file_path
				await window.moduleFs.mkdir(target_path)
			} else {
				await files_progress_dialog.log(`Downloading: ${file_path} (${file_size})`)
				var response = await board_control.get_file_content(file_path)
				if(response.ok) {
					var target_path = save_path + file_path
					const data = response.content
					await window.moduleFs.writeFile(target_path, data)
				}
			}
		}
		dir_path = dir_paths.shift()
		if(dir_paths.length == 0) drill = false
	}
	await files_progress_dialog.log("Download finished.")
	await files_progress_dialog.enable_buttons()
}

/*****************************************************************
* Init and setup
*/

async function init_page() {
	LOADING_IMAGE = $("#small_load_image").html()
	setup_events()
	// settings
	show_up_to_date = localStorage.getItem("show_up_to_date") == "1"
	$("#toggle_updates").prop("checked", !show_up_to_date)
	//
	var tab = window.location.hash.substr(1)
	try {
		$(`.tab_link_${tab}`).click()
	} catch(e) {
		$(".tab_link_welcome").click()
	}
	await common.start()
	board_control = common.board_control
	await board_control.start()
	window.board_url = await board_control.get_board_url()
	var vinfo = await board_control.device_info()
	var workflow_type = board_control.type
	is_editable = await board_control.is_editable()
	// configure the page from the workflow
	$("body").addClass(`workflow_type_${workflow_type} loaded`)
	if(is_editable) {
		$("body").addClass("board_editable")
	} else {
		$("body").addClass("board_locked")
	}
	// prepare dialog that requires board_control
	files_progress_dialog.setup(board_control)
	// load some data into the page
	const serial_num = await board_control.serial_num()
	$("#circup_page .title .circuitpy_version").html(await board_control.cp_version())
	$("#circup_page .title .serial_number").html(serial_num)
	$("#welcome_page .serial_number").html(serial_num)
	// circup loading
	$(".update_all, .auto_install").prop("disabled", true)
	$("#circup_page .loading").show()
	$("#circup_page .loading").html(`Loading library bundles...`)
	var prom1 = (async () => {
		await start_circup()
		await bundler.start(common.library_bundle)
		await update_circup_table()
		$(".update_all, .auto_install").prop("disabled", false)
		$("#circup_page .loading").hide()
	})()
	// board inits
	var prom2 = (async () => {
		// *** title
		const uuid = await board_control.get_identifier()
		$(`#top_title .icon_${workflow_type}`).show()
		$(".board_name").html(vinfo.board_name)
		$("title").html(`${vinfo.board_name} - ${uuid}`)
		$(".circuitpy_version").html(vinfo.version)
		$("#version_info_subtitle .subtitle_text").show()
		// *** file list
		await setup_directory()
		await refresh_list()
		// *** welcome page information
		$("a.board_name").prop("href", `https://circuitpython.org/board/${vinfo.board_id}/`)
		if(workflow_type == "usb") {
			$("a.board_drive").prop("href", board_control.root)
			$("a.board_drive").html(board_control.root)
		}
		if(workflow_type == "web") {
			$("a.board_link").prop("href", board_control.workflow_url_base)
			$("a.board_link").html(board_control.workflow_url_base)
			var repl_url = board_control.repl_url()
			$("a.board_repl").prop("href", repl_url)
			$("a.board_repl").html(repl_url.href)
			$("a.board_ip").prop("href", `http://${vinfo.ip}`)
			$("a.board_ip").html(vinfo.ip)
		}
	})()
	//
	await prom1
	await prom2
	window.dispatchEvent(new Event('finished-starting'))
}

const running_buttons = ".auto_install, .update_all, .download_all"
async function run_exclusively(command) {
	if(!install_running) {
		$(running_buttons).prop("disabled", true)
		install_running = true
		await command()
		install_running = false
		$(running_buttons).prop("disabled", false)
	}
}

function setup_events() {
	$("#welcome_page a").on("click", tools.open_outside_sync)

	$("a.board_repl").unbind("click")
	$("a.board_repl").on("click", open_serial_panel)

	$(".auto_install").on("click", async (e) => {
		await run_exclusively(async () => {
			for(const code of CODE_FILES) {
				if(await auto_install(code)) {
					return
				}
			}
		})
	})
	$(".update_all").on("click", (e) => {
		run_exclusively(() => update_all())
	})
	$("#bundle_list #bundle_install").on("click", (e) => {
		run_exclusively(() => bundle_install())
	})

	$(".download_all").on("click", (e) => {
		run_exclusively(() => download_all())
	})

	$(document).on("click", "#file_list_list .analyze", (e) => {
		var path = $(e.currentTarget).data("path")
		run_exclusively(() => auto_install(path))
		return false
	})

	$("#button_install_all").on("click", (e) => {
		install_all()
	})
	$("#toggle_updates").on("click", async (e) => {
		show_up_to_date = !$("#toggle_updates").prop("checked")
		localStorage.setItem("show_up_to_date", show_up_to_date ? "1" : "0")
		await update_circup_table()
	})

	$(".tab_link").on("click", (e) => {
		var target = e.currentTarget.value
		$(".tab_page").hide()
		$(".tab_link").removeClass("active")
		window.location.hash = `#${target}`
		$(`.tab_page_${target}`).show()
		$(`.tab_link_${target}`).addClass("active")
	})

	$("#circup_page .title button").on("click", async (e) => {
		// await pre_update_process()
		if(redo_install_button_callback) redo_install_button_callback()
	})

	window.addEventListener("install-modules", (event) => {
		var libs_list = event?.detail?.install?.modules
		if(libs_list !== undefined) {
			run_exclusively(() => install_a_module(libs_list))
			return
		}
		var target_file = event?.detail?.install?.file
		if(target_file !== undefined) {
			run_exclusively(() => auto_install(target_file))
			return
		}
	})

	window.addEventListener("save-from-directory-dialog", (event) => {
		download_all_event(event)
	})
}

init_page()
