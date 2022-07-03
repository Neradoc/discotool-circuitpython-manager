/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
var circup = new Circup(true);
var workflow_url_base = "http://circuitpython.local";
workflow_url_base = "http://cpy-9673a4.local";

var modules_to_install = [];
var modules_to_update = [];
var test_data;

function semver(str) {
	return str.split(/\./).map((x) => parseInt(x));
}

function semver_compare(a,b) {
	return (
		(parseInt(a.split(".")[0]) - parseInt(b.split(".")[0]))
		|| (parseInt(a.split(".")[1]) - parseInt(b.split(".")[1]))
		|| (parseInt(a.split(".")[2]) - parseInt(b.split(".")[2]))
	);
}

function headers() {
	var username = "";
	var password = "123456"; // $("#password").val();
	return new Headers({
		"Authorization": 'Basic ' + btoa(username + ":" + password),
	});
}

async function get_file(filepath) {
	var heads = headers();
	heads.append("Accept", "application/json")
	return await fetch(
		new URL("/fs/"+filepath, workflow_url_base),
		{
			headers: heads,
			credentials: "include"
		}
	);
}

async function start() {
	await circup.setup_the_modules_list();
}

async function upload_file(upload_path, file) {
	let file_path = new URL("/fs" + upload_path, workflow_url_base);
	var heads = headers();
	heads.append('Content-Type', 'application/octet-stream');
	heads.append('X-Timestamp', file.lastModified);
	var file_data = await file.async("blob");
	const response = await fetch(file_path,
		{
			method: "PUT",
			headers: heads,
			credentials: "include",
			body: file_data,
		}
	);
}

async function create_dir(dir_path) {
	var heads = headers();
	heads.append('X-Timestamp', Date.now());
	const response = await fetch(
		new URL("/fs" + dir_path, workflow_url_base),
		{
			method: "PUT",
			headers: heads,
			credentials: "include",
		}
	);
}

async function install_modules(dependencies) {
	for(pos in dependencies) {
		var module_name = dependencies[pos];
		console.log("Installing",module_name);
		var module = circup.get_module(module_name);
		var module_files = await circup.list_module_files(module);
		if(module.package) {
			await create_dir(`/lib/${module.name}/`);
		}
		for(var ii in module_files) {
			var file = module_files[ii];
			var upload_path = file.name.replace(/^[^\/]+\//, "/");
			// var upload_path = file.name.replace(/^.+?\/lib\//, "/lib/");
			await upload_file(upload_path, file);
		}
	}
	await refresh_list();
}

async function install_all() {
	install_modules(modules_to_update);
}

async function get_module_version(module_name, libs_list) {
	var module = circup.get_module(module_name);
	var module_path = `/lib/${module.name}`
	var pkg = module.package;
	var module_files = [];

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
		var file_response = await get_file(file_name);
		if(!file_response.ok) { continue }
		var file_data = await file_response.text();
		// TODO: report the mpy format and compare to the CP version running
		// console.log(file_data[0],file_data[1]);
		var matches = file_data.match(/(\d+\.\d+\.\d+).+?__version__/);
		if(matches && matches.length > 1) {
			version = matches[1];
			break;
		}
	}
	return version;
}

function dont_need_update(module_name) {
	const index = modules_to_update.indexOf(module_name);
	if (index > -1) {
		modules_to_update.splice(index, 1);
	}
}

async function auto_install(file_name) {
	$("#circup .title").html("Loading...");
	$("#dependencies table tr").remove();
	// setup circup
	await start();
	// list the files, check that code.py is there
	var response = await get_file("");
	var data = await response.json();
	var file_list = data.map((item) => item.name);
	if(!file_list.includes(file_name)) {
		console.log(`Error: ${file_name} not found.`);
		return;
	}
	// list the libs, to know which are missing
	var response = await get_file("/lib/");
	var data = await response.json();
	var libs_list = data.map((item) => item.name);
	// get code.py
	const code_response = await get_file(file_name);
	if(!code_response.ok) {
		console.log(`Error: ${file_name} not found.`);
		return;
	}
	const code_content = await code_response.text();
	// get the list
	const imports = circup.get_imports_from_python(code_content);
	// get the dependencies
	var dependencies = [];
	imports.forEach((a_module) => {
		circup.get_dependencies(a_module, dependencies);
	});
	// list them
	$("#circup .title").html(`Libraries And Dependencies For <b>${file_name}</b>`);
	dependencies.sort();

	modules_to_install = Array.from(dependencies);
	modules_to_update = Array.from(dependencies);

	dependencies.forEach((item) => {
		var module = circup.get_module(item);
		var file_name = module.name + (module.package ? "" : ".mpy");
		var icon = module.package ? "&#128193;" : "&#128196;";
		var template = $("#circup_row").html();
		var new_line = $(template);
		new_line.find("button.upload").on("click",(e) => {
			install_modules([item]);
		});
		new_line.find("button.upload").val(item);
		new_line.find(".icon").html(icon);
		new_line.find(".name").html(item);
		new_line.find(".bundle_version").html(module.version);
		$("#dependencies table").append(new_line);

		new_line.find(".board_version").html("...");
		get_module_version(item, libs_list).then((version) => {
			if(version) {
				new_line.find(".board_version").html(version);
			}
			if(version === null) {
				// no file
				new_line.find(".status").html("&#10071;&#65039; New module");
				return;
			}
			if(version === false) {
				// invalid file, replace
				new_line.find(".status").html("&#10071;&#65039; Module invalid");
				return;
			}
			if(module.version == version) {
				// no need to update
				new_line.addClass("exists");
				new_line.find(".status").html("Up to date");
				new_line.hide(2000, () => {
					$('#circup .line').removeClass("odd");
					$('#circup .line').removeClass("even");
					$('#circup .line:visible:odd').addClass("odd");
					$('#circup .line:visible:even').addClass("even");
				});
				dont_need_update(module.name);
				return;
			}
			if(semver(module.version)[0] != semver(version)[0]) {
				// this is a major update
				new_line.find(".status").html("&#10071;&#65039; Major update");
				return;
			}
			// this is a normal update
			new_line.find(".status").html("&#10071;&#65039; Update available");
		});
	});
	$("#circup .buttons").show();
}

async function is_editable() {
	const status = await fetch(new URL("/fs/", workflow_url_base),
		{
			method: "OPTIONS",
			headers: headers(),
			credentials: "include",
		}
	);
	var editable = status.headers
		.get("Access-Control-Allow-Methods")
		.toLowerCase()
		.includes("delete");
	return editable;
}

$("#auto_install").on("click", (e) => {
	auto_install("code.py");
});
