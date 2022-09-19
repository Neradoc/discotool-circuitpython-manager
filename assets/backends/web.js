/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
import { Workflow, WorkflowResponse, WorkflowFile } from "./workflow_base.js"
import { WORKFLOW_USERNAME, WORKFLOW_PASSWORD } from "../../config.js"
import * as tools from "../lib/tools.js"
import * as mdns from "../lib/mdns.js"

class WebResponse extends WorkflowResponse {
	constructor(response, content, ok=null) {
		if(ok===null) ok = response.ok
		super(ok, content, response.status, response.statusText)
	}
}

class WebWorkflowFile extends WorkflowFile {
	constructor(result) {
		super(
			result.name,
			result.directory,
			result.file_size,
			result.modified_ns / 1000000,
		);
	}
}

const DEFAULT_URL_BASE = "http://circuitpython.local"

class WebWorkflow extends Workflow {
	constructor(url_base = DEFAULT_URL_BASE) {
		super()
		this.workflow_url_base = url_base
		this.version_info = null
		this.drive_name = null
		this.username = WORKFLOW_USERNAME
		this.password = WORKFLOW_PASSWORD
	}
	async start(url_passed=null) {
		// TODO: setup the actual URL for the workflow OUTSIDE
		// var url = new URL(window.location);
		// var url_passed = url.searchParams.get("device");
		try {
			if(url_passed) {
				var url_test = new URL("/", `http://${url_passed}`);
			} else {
				var url_test = new URL("/", this.workflow_url_base);
			}
			var response = await fetch(url_test)
			this.workflow_url_base = response.url
			// console.log(`Board URL: ${this.workflow_url_base}`);
			return true
		} catch(e) {
			console.log("While trying", url_test)
			console.log("No Web Workflow Found")
			console.log(e)
		}
		return false;
	}
	async device_info() {
		if(this.version_info !== null) {
			return this.version_info;
		}
		var response = await fetch(
			new URL("/cp/version.json", this.workflow_url_base),
		);
		this.version_info = await response.json();
		if( "UID" in this.version_info ) {
			this.version_info.serial_num = this.version_info["UID"]
		}
		return this.version_info;
	}
	async is_editable() {
		const status = await fetch(new URL("/fs/", this.workflow_url_base),
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
	async get_file_content(file_path, range=null) {
		var heads = this.headers();
		var url = new URL("/fs"+file_path, this.workflow_url_base);
		var response = await fetch(
			url,
			{
				headers: heads,
				credentials: "include",
			}
		);
		try {
			var file_content = await response.text();
			return new WebResponse(response, file_content);
		} catch {
			return new WebResponse(response, null, false);
		}
	}
	async list_dir(dir_path) {
		if (!dir_path.endsWith("/")) {
			dir_path += "/";
		}
		var heads = this.headers({"Accept": "application/json"});
		var url = new URL("/fs"+dir_path, this.workflow_url_base);
		// console.log("URL", url)
		var response = await fetch(
			url,
			{
				headers: heads,
				credentials: "include",
			}
		);
		try {
			var data = await response.json();
			var file_list = data.map((d) => new WebWorkflowFile(d))
			return new WebResponse(response, file_list);
		} catch {
			return new WebResponse(response, [], false);
		}
	}
	async upload_file(upload_path, file_data) {
		var heads = this.headers({
			'Content-Type': 'application/octet-stream',
			'X-Timestamp': Date.now() * 1000, // file.lastModified,
		});
		const file_url = new URL("/fs" + upload_path, this.workflow_url_base);
		const response = await fetch(file_url,
			{
				method: "PUT",
				headers: heads,
				credentials: "include",
				body: file_data,
			}
		);
		if(response.status == 409) {
			console.log("Error: Cannot write to the drive");
			return new WorkflowResponse(false, null, 409, "Error: Cannot write to the drive");
		}
		return new WorkflowResponse(true, null);
	}
	async create_dir(dir_path) {
		var heads = this.headers({'X-Timestamp': Date.now()});
		const response = await fetch(
			new URL("/fs" + dir_path, this.workflow_url_base),
			{
				method: "PUT",
				headers: heads,
				credentials: "include",
			}
		);
		if(response.status == 409) {
			console.log("Error: Cannot write to the drive");
			return new WorkflowResponse(false, null, 409, "Error: Cannot write to the drive");
		}
		return new WorkflowResponse(true, null);
	}
	async delete_file(file_path) {
		const target_url = this.api_url(file_path)
		const response = await fetch(target_url,
			{
				method: "DELETE",
				headers: this.headers(),
			}
		)
		return new WebResponse(response, "");
	}
	async rename_file(from_path, to_path) {
		const target_url = this.api_url(from_path)
		const destination = this.api_url(to_path).pathname
		const response = await fetch(target_url,
			{
				method: "MOVE",
				headers: this.headers({
					'X-Destination': destination,
				}),
			}
		)
		return new WebResponse(response, "");
	}
	api_url(file_path) {
		return new URL("/fs" + file_path, this.workflow_url_base);
	}
	edit_url(file_path) {
		var url = new URL("/edit/", this.workflow_url_base);
		url.hash = `#${file_path}`
		return url
	}
	repl_url() {
		return new URL("/cp/serial/", this.workflow_url_base);
	}
	async get_identifier() {
		return (await this.device_info()).hostname + ".local"
	}
	async get_board_url() {
		return this.workflow_url_base
	}

	//##############################################################

	set_credentials(username, password) {
		if(username != undefined) {
			this.username = username;
		}
		if(password != undefined) {
			this.password = password
		}
	}
	get_password() {
		return this.password;
	}
	
	headers(others=null) {
		var encoded = btoa(this.username + ":" + this.password)
		var head = new Headers({
			"Authorization": 'Basic ' + encoded,
		});
		if (others) {
			for (var key in others) {
				head.append(key, others[key]);
			}
		}
		return head;
	}

	static async find_devices() {
		if(mdns.available()) {
			const candidates = await mdns.scan_for_candidates()
			return Object.values(candidates)
		}
		//
		try {
			var webby = await new WebWorkflow()
			await webby.start()
			const response = await fetch(
				new URL("/cp/devices.json", webby.workflow_url_base)
			);
			var data = await response.json();
			var devices = data.devices
			// add myself
			const web_info = await webby.device_info()
			devices.push({
				hostname: web_info.hostname,
				instance_name: web_info.board_name,
				ip: web_info.ip,
				port: web_info.port,
			})
			return devices
		} catch(e) {
			console.log(e)
			return []
		}
	}
	icon = "&#127760;"
	type = "web"
	supports_credentials = true
	static available = true
}

export { WebWorkflow };
