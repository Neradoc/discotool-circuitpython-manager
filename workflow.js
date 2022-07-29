/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import { BUNDLE_ACCESS } from "./workflow-config.js";
import * as common from "./workflow-common.js";
import { setup_directory, find_devices, refresh_list } from "./workflow-directory.js";
import { Circup } from "./circup.js";
import * as bundler from "./workflow-bundler.js";

const DEBUG = common.DEBUG;
const LINE_HIDE_DELAY = 1000;
const LOADING_IMAGE = '<img class="small_load_image" src="loading_black_small.gif" />';
const BAD_MPY = -1;

var modules_to_update = [];
var cpver = null;
var circup = null;
var install_running = false;
var show_up_to_date = false;

function semver(str) {
	return str.split("-")[0].split(/\./).map((x) => parseInt(x));
}

function semver_compare(a,b) {
	return (
		(parseInt(a.split(".")[0]) - parseInt(b.split(".")[0]))
		|| (parseInt(a.split(".")[1]) - parseInt(b.split(".")[1]))
		|| (parseInt(a.split(".")[2]) - parseInt(b.split(".")[2]))
	);
}

async function get_file(filepath) {
	var heads = common.headers({"Accept": "application/json"});
	console.log(common.workflow_url_base, "/fs", filepath);
	var url = new URL("/fs"+filepath, common.workflow_url_base);
	return await fetch(
		url,
		{
			headers: heads,
			credentials: "include",
		}
	);
}

var _version_info = null;
async function cp_version_json() {
	if(_version_info !== null) {
		return _version_info;
	}
	console.log(new URL("/cp/version.json", common.workflow_url_base));
	var response = await fetch(
		new URL("/cp/version.json", common.workflow_url_base),
	);
	_version_info = await response.json();
	console.log(_version_info);
	return _version_info;
}

async function cp_version() {
	var version_data = await cp_version_json();
	return version_data.version;
}

async function is_editable() {
	console.log(new URL("/fs/", common.workflow_url_base));
	const status = await fetch(new URL("/fs/", common.workflow_url_base),
		{
			method: "OPTIONS",
			credentials: "include",
		}
	);
	var editable = status.headers
		.get("Access-Control-Allow-Methods")
		.toLowerCase()
		.includes("delete");
	return editable;
}

async function get_lib_directory() {
	var response = await get_file("/lib/");
	var data = await response.json();
	return data.map((item) => item.name);
}

async function start_circup() {
	if (circup == null) {
		// get the version data
		cpver = semver(await cp_version());
		// init circup with the CP version
		circup = new Circup(BUNDLE_ACCESS, cpver);
		// circup = new Circup(true, cpver);
		await circup.setup_the_modules_list();
	}
}

async function upload_file(upload_path, file) {
	var heads = common.headers({
		'Content-Type': 'application/octet-stream',
		'X-Timestamp': file.lastModified,
	});
	var file_data = await file.async("blob");
	const file_url = new URL("/fs" + upload_path, common.workflow_url_base);
	console.log(file_url);
	const response = await fetch(file_url,
		{
			method: "PUT",
			headers: heads,
			credentials: "include",
			body: file_data,
		}
	);
}

async function create_dir(dir_path) {
	var heads = common.headers({'X-Timestamp': Date.now()});
	console.log(new URL("/fs" + dir_path, common.workflow_url_base));
	const response = await fetch(
		new URL("/fs" + dir_path, common.workflow_url_base),
		{
			method: "PUT",
			headers: heads,
			credentials: "include",
		}
	);
}

async function install_modules(dependencies) {
	for(var module_name of dependencies) {
		console.log("Installing", module_name);
		var module = circup.get_module(module_name);
		var module_files = await circup.list_module_files(module);
		if(module.package) {
			await create_dir(`/lib/${module.name}/`);
		}
		for(var file of module_files) {
			var upload_path = file.name.replace(/^[^\/]+\//, "/");
			// var upload_path = file.name.replace(/^.+?\/lib\//, "/lib/");
			await upload_file(upload_path, file);
		}
	}
	await refresh_list();
}

async function install_all() {
	$(".install_buttons").attr("disabled", true);
	var modules = Array.from(modules_to_update);
	for (var line of $("#circup tr.line")) {
		var button = $(line).find(".upload button");
		var module_name = button.val();
		if(modules.includes(module_name)) {
			await upload_button_call({ "target":button });
		}
	}
	$(".install_buttons").attr("disabled", false);
}

async function get_module_version(module_name, libs_list) {
	var module = circup.get_module(module_name);
	var module_path = `/lib/${module.name}`
	var pkg = module.package;
	var module_files = [];
	var cpver = await cp_version();

	if(pkg && libs_list.includes(module.name)) {
		// look at all files in the package
		var response = await get_file(module_path + "/");
		var data = await response.json();
		// module_files = data.map((item) => item.name);
		module_files = data.map((item) => module_path + "/" + item.name);
	} else if(!pkg && libs_list.includes(module.name + ".py")) {
		module_files = [module_path+".py"];
	} else if(!pkg && libs_list.includes(module.name + ".mpy")) {
		module_files = [module_path+".mpy"];
	} else {
		return null;
	}

	var version = false;
	for(var file_name of module_files) {
		var file_response = await get_file("/" + file_name);
		if(!file_response.ok) { continue }
		var file_data = await file_response.text();
		// empty MPY files are bad
		if(file_data.length == 0 && file_name.endsWith(".mpy")) {
			version = null;
			break;
		}
		if(file_data.length > 0) {
			if(file_name.endsWith(".mpy")) {
				// bad version of mpy files
				if(file_data[0] != "C" || file_data[1] != "\x05") {
					version = BAD_MPY;
					break;
				}
				// find version in mpy file
				var matches = file_data.match(/(\d+\.\d+\.\d+).+?__version__/);
				if(matches && matches.length > 1) {
					version = matches[1];
				}
			}
			// find version in py file
			if(file_name.endsWith(".py")) {
				var matches = file_data.match(/__version__.+?(\d+\.\d+\.\d+)/);
				if(matches && matches.length > 1) {
					version = matches[1];
				}
			}
		}
	}
	return version;
}

function dont_need_update(module_name) {
	const index = modules_to_update.indexOf(module_name);
	if (index > -1) {
		modules_to_update.splice(index, 1);
	}
	if(modules_to_update.length == 0) {
		$("#circup .all_up_to_date").show()
		$("#circup .loading").hide();
	}
}

async function update_circup_table() {
	$('#circup .line').removeClass("odd even");
	if (show_up_to_date) {
		if ($('#circup .line').length > 0) {
			await $("#dependencies table thead").show(LINE_HIDE_DELAY).promise();
		} else {
			await $("#dependencies table thead").hide(LINE_HIDE_DELAY).promise();
		}
		$('#circup .line:odd').addClass("odd");
		$('#circup .line:even').addClass("even");
	} else {
		if($('#circup .line').not(".module_exists").length > 0) {
			await $("#dependencies table thead").show(LINE_HIDE_DELAY).promise();
		} else {
			await $("#dependencies table thead").hide(LINE_HIDE_DELAY).promise();
		}
		$('#circup .line').not(".module_exists").odd().addClass("odd");
		$('#circup .line').not(".module_exists").even().addClass("even");
	}
}

async function pre_update_process() {
	$("#circup .hide").hide();
	$("#dependencies table tbody tr").remove();
	// setup circup
	$("#circup .loading").html(`Loading library bundles...`).show();
}

async function update_line(new_line, libs_list) {
	var module_name = new_line.find(".upload button").val();
	var module = circup.get_module(module_name);
	new_line.find(".status_icon").html(LOADING_IMAGE);
	new_line.removeClass("bad_mpy_module new_module invalid_module module_exists major_update_module update_module");
	// module versions from the board
	var version = await get_module_version(module_name, libs_list);
	if(version && version != BAD_MPY) {
		new_line.find(".board_version").html(version);
	}
	if(version === BAD_MPY) {
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
			await new_line.hide(LINE_HIDE_DELAY).promise();
			await update_circup_table();
		}
		dont_need_update(module_name);
	} else if(semver(module.version)[0] != semver(version)[0]) {
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
	await install_modules([target_module])
	var the_libs = await get_lib_directory();
	await update_line(line, the_libs);
}

async function run_update_process(imports) {
	$("#circup .loading").append(`<br/>Loading dependencies...`);
	// list the libs, to know which are missing
	var libs_list = await get_lib_directory();
	// get the dependencies
	var dependencies = [];
	imports.forEach((a_module) => {
		circup.get_dependencies(a_module, dependencies);
	});
	// list them
	dependencies.sort();

	if (!DEBUG) {
		$("#circup .loading").hide(1000);
	}
	$("#circup .title .circuitpy_version").html(await cp_version());
	$("#circup .title").show();
	$("#circup #button_install_all").attr("disabled", true);
	$("#circup .buttons").show();
	$("#dependencies table thead").show();

	modules_to_update = Array.from(dependencies);

	var new_lines = [];
	for(var dependency of dependencies) {
		var module = circup.get_module(dependency);
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
		await update_line(new_line, libs_list);
	}
	$("#circup #button_install_all").attr("disabled", false);
}

async function auto_install(file_name) {
	await pre_update_process();
	$("#circup .loading").append(`<br/>Loading <b>${file_name}</b>...`);
	$("#circup .title .filename").html(file_name);
	// get the file
	const code_response = await get_file("/" + file_name);
	if(!code_response.ok) {
		console.log(`Error: ${file_name} not found.`);
		// TODO: make sure to exit gracefully
		return;
	}
	const code_content = await code_response.text();
	// get the list
	$("#circup .loading").append(`<br/>Loading modules from <b>${file_name}</b>...`);
	const imports = circup.get_imports_from_python(code_content);
	console.log("imports", imports);
	// do the thing
	await run_update_process(imports);
}

async function update_all() {
	await pre_update_process();
	$("#circup .loading").append(`<br/>Loading libraries from <b>/lib</b> directory...`);
	$("#circup .title .filename").html("/lib/");
	// get the list of libraries from the board
	var libs_list = await get_lib_directory();
	libs_list = libs_list
		.filter((item) => !item.startsWith("."))
		.map((item) => item.replace(/\.m?py$/,""));
	// do the thing
	await run_update_process(libs_list);
}

async function bundle_install() {
	await pre_update_process();
	$("#circup .loading").append(`<br/>Loading libraries selected from the bundles...`);
	$("#circup .title .filename").html("selected bundle modules");
	// get the list of libraries from the board
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
	// this is in parallel to the board ones
	var prom1 = (async () => {
		await start_circup();
		await bundler.start(circup);
	})();
	// board inits
	var prom2 = (async () => {
		await setup_directory();
		await find_devices();
		var vinfo = await cp_version_json();
		$(".board_name").html(vinfo.board_name);
		$(".circuitpy_version").html(vinfo.version);
		$("#version_info_subtitle .subtitle_text").show();
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

$("#button_install_all").on("click", (e) => {
	install_all();
});
$("#toggle_updates").on("click", async (e) => {
	show_up_to_date = !show_up_to_date;
	if (show_up_to_date) {
		await $('#circup .module_exists').show(LINE_HIDE_DELAY).promise();
	} else {
		await $('#circup .module_exists').hide(LINE_HIDE_DELAY).promise();
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
