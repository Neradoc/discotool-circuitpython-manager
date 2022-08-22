/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import { BUNDLE_ACCESS } from "../../config.js";
import * as common from "./common.js";
import { setup_directory, refresh_list } from "./workflow-directory.js";
import { LibraryBundle } from "../lib/bundle.js";
import { Circup } from "../lib/circup.js";
import * as bundler from "./workflow-bundler.js";

// import { $ } from "../extlib/jquery.min.js";

var board_control = null;
var circup = null

const DEBUG = common.DEBUG;
const LINE_HIDE_DELAY = 800;
const LOADING_IMAGE = $("#small_load_image").html();

var modules_to_update = [];
var cpver = null;
var library_bundle = null;
var install_running = false;
var show_up_to_date = false;

async function start_circup() {
	if (circup == null) {
		// 1 - setup the board control as selected if not already
		// get the version data
		cpver = await board_control.cp_version()
		// 2 - setup the library bundle with the version from the board
		// init circup with the CP version
		library_bundle = new LibraryBundle(BUNDLE_ACCESS, cpver);
		await library_bundle.setup_the_modules_list();
		// 3 - setup the circup updates manager for the actions
		circup = new Circup(library_bundle, board_control)
		await circup.start()
	}
}

async function update_boards_list() {
	// NOTE: web specific
	var boards_list = await board_control.find_devices();
	$(".boards_list .boards_list_default").hide();
	var devices = boards_list.devices;
	if(devices.length > 0) {
		var liste = $("<ul></ul>");
		for(var device of devices) {
			var link = $(`<a href="">${device.hostname} / ${device.ip}</a>`);
			link.attr("href", common.url_here({"dev": device.ip}).href);
			var line = $(`<li>${device.instance_name} at </li>`);
			line.append(link);
			liste.append(line);
		}
		$(".boards_list .boards_list_list").empty().append("Other boards:").append(liste).show();
	} else {
		$(".boards_list .boards_list_empty").show();
	}
}

async function install_all() {
	$(".install_buttons").attr("disabled", true);
	var modules = Array.from(modules_to_update);
	for (var line of $("#circup_page tr.line")) {
		var button = $(line).find(".upload button");
		var module_name = button.val();
		if(modules.includes(module_name)) {
			await upload_button_call({ "target":button });
		}
	}
	$(".install_buttons").attr("disabled", false);
}

function dont_need_update(module_name) {
	const index = modules_to_update.indexOf(module_name);
	if (index > -1) {
		modules_to_update.splice(index, 1);
	}
	if(modules_to_update.length == 0) {
		$("#circup_page .all_up_to_date").show()
		$("#circup_page .loading").hide();
	}
}

async function update_circup_table() {
	$('#circup_page .line').removeClass("odd even");
	if (show_up_to_date) {
		if ($('#circup_page .line').length > 0) {
			await $("#dependencies table thead").show(LINE_HIDE_DELAY).promise();
		} else {
			await $("#dependencies table thead").hide(LINE_HIDE_DELAY).promise();
		}
		$('#circup_page .line:odd').addClass("odd");
		$('#circup_page .line:even').addClass("even");
	} else {
		if($('#circup_page .line').not(".module_exists").length > 0) {
			await $("#dependencies table thead").show(LINE_HIDE_DELAY).promise();
		} else {
			await $("#dependencies table thead").hide(LINE_HIDE_DELAY).promise();
		}
		$('#circup_page .line').not(".module_exists").odd().addClass("odd");
		$('#circup_page .line').not(".module_exists").even().addClass("even");
	}
}

async function pre_update_process() {
	$("#circup_page .hide").hide();
	$("#dependencies table tbody tr").remove();
	// setup circup
	$("#circup_page .loading").html(`Loading library bundles...`).show();
}

async function update_line(new_line, board_libs) {
	var module_name = new_line.find(".upload button").val();
	var module = library_bundle.get_module(module_name);
	new_line.find(".status_icon").html(LOADING_IMAGE);
	new_line.removeClass("bad_mpy_module new_module invalid_module module_exists major_update_module update_module");
	// module versions from the board
	var version = await circup.get_module_version(module_name, board_libs);
	if(version && version != circup.BAD_MPY) {
		new_line.find(".board_version").html(version);
	}
	if(version === circup.BAD_MPY) {
		// bad mpy file
		new_line.addClass("bad_mpy_module");
		new_line.find(".status_icon").html("&#9888;&#65039;");
		new_line.find(".status").html("Bad MPY Format");
	} else if(version === null) {
		// no file
		new_line.addClass("new_module");
		new_line.find(".status_icon").html("&#10069;");
		new_line.find(".status").html("Missing Module");
	} else if(version === false) {
		// invalid file, replace
		new_line.addClass("invalid_module");
		new_line.find(".status_icon").html("&#9888;&#65039;");
		new_line.find(".status").html("Module Invalid");
	} else if(module.version == version) {
		// no need to update
		new_line.addClass("module_exists");
		new_line.find(".status_icon").html("&#10004;&#65038;");
		new_line.find(".status").html("Up To Date");
		if (!show_up_to_date) {
			// await new_line.hide(LINE_HIDE_DELAY).promise();
			new_line.hide(LINE_HIDE_DELAY)
			await update_circup_table();
		}
		dont_need_update(module_name);
	} else if(module.version[0] != version[0]) {
		// this is a major update
		new_line.addClass("major_update_module");
		new_line.find(".status_icon").html("&#8252;&#65039;");
		new_line.find(".status").html("Major Update");
	} else {
		// this is a normal update
		new_line.addClass("update_module");
		new_line.find(".status_icon").html("&#10071;&#65039;");
		new_line.find(".status").html("Update Available");
	}
	new_line.find(".upload button").attr("disabled", false);
}

async function upload_button_call(e) {
	var button = $(e.target);
	var target_module = button.val();
	var line = button.parents("tr.line");
	button.attr("disabled", true);
	line.find(".status_icon").html(LOADING_IMAGE);
	await circup.install_modules([target_module])
	await refresh_list()
	var board_libs = await board_control.get_lib_directory();
	await update_line(line, board_libs);
}

async function run_update_process(imports) {
	$("#circup_page .loading").append(`<br/>Loading dependencies...`);
	// list the libs, to know which are missing
	var board_libs = await board_control.get_lib_directory();
	// get the dependencies
	var dependencies = []
	library_bundle.get_dependencies(imports, dependencies);
	// list them
	dependencies.sort();

	if (!DEBUG) {
		$("#circup_page .loading").hide(1000);
	}
	$("#circup_page .title").show();
	$("#circup_page #button_install_all").attr("disabled", true);
	$("#circup_page .buttons").show();
	$("#dependencies table thead").show();

	modules_to_update = Array.from(dependencies);
	console.log(modules_to_update)

	var new_lines = [];
	for(var dependency of dependencies) {
		var module = library_bundle.get_module(dependency);
		var file_name = module.name + (module.package ? "" : ".mpy");
		var icon = module.package ? "&#128193;" : "&#128196;";
		var template = $("#circup_row").html();
		var new_line = $(template);
		new_line.find(".upload button").on("click", upload_button_call);
		new_line.find(".upload button").val(dependency);
		new_line.find(".icon").html(icon);
		new_line.find(".name").html(dependency);
		new_line.find(".bundle_version").html(module.version);
		new_line.find(".board_version").html("...");
		if (imports.includes(dependency)) {
			new_line.addClass("imported");
		}
		$("#dependencies table tbody").append(new_line);
		new_lines.push(new_line);
	}
	for(var new_line of new_lines) {
		await update_line(new_line, board_libs);
	}
	$("#circup_page #button_install_all").attr("disabled", false);
}

async function auto_install(file_name) {
	// TODO: wait until the bundle and board are inited
	await pre_update_process();
	$("#circup_page .loading").append(`<br/>Loading <b>${file_name}</b>...`);
	$("#circup_page .title .filename").html(file_name);
	// get the file
	var code_response = await board_control.get_file_content("/" + file_name);
	if(!code_response.ok) {
		console.log(`Error: ${file_name} not found.`);
		// TODO: make sure to exit gracefully
		return;
	}
	// get the list
	const code_content = code_response.content;
	$("#circup_page .loading").append(`<br/>Loading modules from <b>${file_name}</b>...`);
	const imports = library_bundle.get_imports_from_python(code_content);
	console.log("imports", imports);
	// do the thing
	await run_update_process(imports);
}

async function update_all() {
	// TODO: wait until the bundle and board are inited
	await pre_update_process();
	$("#circup_page .loading").append(`<br/>Loading libraries from <b>/lib</b> directory...`);
	$("#circup_page .title .filename").html("/lib/");
	// get the list of libraries from the board
	var libs_list = await board_control.get_lib_modules();
	// do the thing
	await run_update_process(libs_list);
}

async function bundle_install() {
	await pre_update_process();
	$("#circup_page .loading").append(`<br/>Loading libraries selected from the bundles...`);
	$("#circup_page .title .filename").html("selected bundle modules");
	// get the list of libraries to install
	var libs_list = bundler.modules_list;
	// do the thing
	await run_update_process(libs_list);
}

async function init_page() {
	var tab = window.location.hash.substr(1);
	try {
		$(`.tab_link_${tab}`).click();
	} catch(e) {
		$(".tab_link_welcome").click();
	}
	await common.start();
	board_control = common.board_control
	await board_control.start();
	var vinfo = await board_control.device_info();
	var workflow_type = board_control.type
	// load some data into the page
	$("#circup_page .title .circuitpy_version").html(await board_control.cp_version());
	$("#circup_page .title .serial_number").html(await board_control.serial_num());
	$("#welcome_page .serial_number").html(await board_control.serial_num());
	// circup loading
	var prom1 = (async () => {
		await start_circup();
		await bundler.start(library_bundle);
	})();
	// board inits
	var prom2 = (async () => {
		// *** title
		$(`#top_title .icon_${workflow_type}`).show()
		if(!await board_control.is_editable()) {
			$("#top_title .icon_locked").show()
		}
		$(".board_name").html(vinfo.board_name)
		$(".circuitpy_version").html(vinfo.version)
		$("#version_info_subtitle .subtitle_text").show()
		// *** file list
		await setup_directory()
		await refresh_list()
		// *** welcome page information
		$("a.board_name").attr("href", `https://circuitpython.org/board/${vinfo.board_id}/`);
		if(workflow_type == "web") {
			$("a.board_link").attr("href", board_control.workflow_url_base);
			$("a.board_link").html(board_control.workflow_url_base);
			var repl_url = board_control.repl_url()
			$("a.board_repl").attr("href", repl_url);
			$("a.board_repl").html(repl_url.href);
			$("a.board_ip").attr("href", `http://${vinfo.ip}`);
			$("a.board_ip").html(vinfo.ip);
		} else {
			$("div.web_workflow").remove()
		}
		// other boards
		$(".boards_list").remove()
		// update_boards_list()
	})();
	//
	await prom1;
	await prom2;
}

const running_buttons = ".auto_install, .update_all";
async function run_exclusively(command) {
	if(!install_running) {
		$(running_buttons).attr("disabled", true);
		install_running = true;
		await command();
		install_running = false;
		$(running_buttons).attr("disabled", false);
	}
}

$(".auto_install").on("click", (e) => {
	$(".tab_link_circup").click();
	run_exclusively(() => auto_install("code.py"));
});
$(".update_all").on("click", (e) => {
	$(".tab_link_circup").click();
	run_exclusively(() => update_all());
});
$("#bundle_list #bundle_install").on("click", (e) => {
	$(".tab_link_circup").click();
	run_exclusively(() => bundle_install());
});
$(document).on("click", "#file_list_list .analyze", (e) => {
	var path = $(e.target).data("path");
	$(".tab_link_circup").click();
	run_exclusively(() => auto_install(path));
	return false;
});

$("#button_install_all").on("click", (e) => {
	install_all();
});
$("#toggle_updates").on("click", async (e) => {
	show_up_to_date = !show_up_to_date;
	if (show_up_to_date) {
		await $('#circup_page .module_exists').show(LINE_HIDE_DELAY).promise();
	} else {
		await $('#circup_page .module_exists').hide(LINE_HIDE_DELAY).promise();
	}
	await update_circup_table();
});

$(".tab_link").on("click", (e) => {
	var target = e.target.value;
	$(".tab_page").hide();
	$(".tab_link").removeClass("active")
	window.location.hash = `#${target}`;
	$(`.tab_page_${target}`).show();
	$(`.tab_link_${target}`).addClass("active");
});

init_page();
