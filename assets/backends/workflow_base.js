/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

class WorkflowResponse {
	constructor(ok, content, status=200, statusText="OK") {
		this.ok = ok;
		this.status = status;
		this.statusText = statusText;
		this.content = content;
		// have text and json ?
		// rename json to array/dict ?
	}
}

class WorkflowFile {
	constructor(name, directory, size, time, creation_time=0) {
		this.name = name;
		this.directory = directory;
		this.file_size = size;
		this.modified = time;
		this.created = creation_time || time;
	}
}

function semver(str) {
	return str.split("-")[0].split(/\./).map((x) => parseInt(x));
}

class Workflow {

	constructor() {
	}
	async start() {
	}
	async device_info() {
		return {
			"version": null
		};
	}
	async cp_version() {
		var version_data = await this.device_info();
		return semver(version_data.version);
	}
	async is_editable() {
		return false;
	}
	async get_file_content(filepath, range=null) {
		// return `print("Hello world")`;
		return new WorkflowResponse(false, null);;
	}
	async list_dir(dirpath) {
		// return ["/code.py", "/boot_out.txt", "/lib/"];
		return new WorkflowResponse(false, []);
	}
	async upload_file(upload_path, file) {
		console.log("Error: Cannot write to the drive");
		return new WorkflowResponse(false, null, 409, "ERROR");
	}
	async create_dir(dir_path) {
		console.log("Error: Cannot write to the drive");
		return new WorkflowResponse(false, null, 409, "ERROR");
	}
	async delete_file(file_path) {
		console.log("Error: Cannot write to the drive");
		return new WorkflowResponse(false, null, 409, "ERROR");
	}
	api_url(file_path) {
		return new URL(`file://${file_path}`);
	}
	edit_url(file_path) {
		return new URL(`file://${file_path}`);
	}
	repl_url() {
		return "";
	}
	async find_devices() {
		return { devices: [] };
	}
}

export { Workflow, WorkflowResponse, WorkflowFile };
