/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
var circup = new Circup(true);
var workflow_url_base = "http://circuitpython.local";
workflow_url_base = "http://cpy-9673a4.local";

var modules_to_install = [];

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
	$("#circup .title .loading").html("Loading...");
	await circup.setup_the_modules_list();
	$("#circup .title .loading").hide();
}

async function upload_file(upload_path, file) {
	console.log("upload");
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
		var module = circup.get_module(module_name);
		console.log(module.name, module.package);
		var module_files = await circup.list_module_files(module);
		console.log(module_files);
		if(module.package) {
			console.log("Create dir", `/lib/${module.name}`);
			await create_dir(`/lib/${module.name}/`);
		}
		for(var ii in module_files) {
			var file = module_files[ii];
			var upload_path = file.name.replace(/^[^\/]+\//, "/");
			console.log(file.name, upload_path);
			await upload_file(upload_path, file);
		}
	}
}

async function install_all() {
	install_modules(modules_to_install);
	// refresh_list();
}

async function auto_install(file_name) {
	// setup circup
	await start();
	//
	var response = await get_file("");
	var data = await response.json();
	var file_list = data.map((item) => item.name);
	if(!file_list.includes(file_name)) {
		console.log(`Error: ${file_name} not found.`);
		return;
	}
	//
	var response = await get_file("/lib/");
	var data = await response.json();
	var libs_list = data.map((item) => item.name);
	console.log(libs_list);
	// get code.py
	const code_response = await get_file(file_name);
	if(!code_response.ok) {
		console.log(`Error: ${file_name} not found.`);
		return;
	}
	const code_content = await code_response.text();
	// get the list
	const imports = circup.get_imports_from_python(code_content);
	console.log("imports", imports);
	// get the dependencies
	var dependencies = [];
	imports.forEach((a_module) => {
		circup.get_dependencies(a_module, dependencies);
	});
	console.log("Dependencies", dependencies);
	// list them
	dependencies.sort();
	dependencies.forEach((item) => {
		var module = circup.get_module(item);
		var file_name = module.name + (module.package ? "" : ".mpy");
		if(libs_list.includes(file_name)) {
			style = "exists";
			new_icon = "";
		} else {
			style = "new";
			new_icon = "&#10071;&#65039;";
		}
		var icon = module.package ? "&#128193;" : "&#128196;";
		$("#dependencies").append(`<p class="line ${style}"><button class="upload" onclick="install_modules(['${item}']);" name="install" value="${item}">Install</button> ${icon} ${item} ${new_icon}</p>`);
	});
	$("#dependencies").append(`<p class="line"><button onclick="install_all()" class="upload" name="install_all" value="">Install All</button></p>`);
	modules_to_install = dependencies;
}

async function do_the_thing() {
	console.log("OPTIONS");
	const status = await fetch(new URL("/fs/", workflow_url_base),
		{
			method: "OPTIONS",
			headers: headers(),
			credentials: "include",
		}
	);
	console.log(status.headers.get("Access-Control-Allow-Methods"));
	editable = status.headers.get("Access-Control-Allow-Methods").toLowerCase().includes("delete");
	console.log("Editable", editable);

	await auto_install("code.py");
}

do_the_thing();
