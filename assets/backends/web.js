/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
import { Workflow, WorkflowResponse, WorkflowFile, WorkflowWithCredentials } from "./workflow_base.js"
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

const DEFAULT_URL_BASE = "http://circuitpython.local:80"

class WebWorkflow extends WorkflowWithCredentials {
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
		try {
			var response = await fetch(
				new URL("/cp/version.json", this.workflow_url_base),
			);
			this.version_info = await response.json();
			if( "UID" in this.version_info ) {
				this.version_info.serial_num = this.version_info["UID"]
			}
		} catch(e) {
			console.log("Device inaccessible")
			return {}
		}
		return this.version_info
	}
	async is_editable() {
		try {
			const status = await fetch(this.api_url("/"),
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
		} catch(e) {
			console.log("Device inaccessible")
			return false
		}
	}
	async get_file_content(file_path, range=null) {
		var heads = this.headers();
		var url = this.api_url(file_path)
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
		var url = this.api_url(dir_path)
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
		const file_url = this.api_url(upload_path)
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
		if(!dir_path.match(/\/$/)) {
			dir_path += "/"
		}
		const response = await fetch(
			this.api_url(dir_path),
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
		var sub_path = `/fs/${file_path}`.replace("//", "/")
		var url = new URL(sub_path, this.workflow_url_base)
		return url
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
		const u = new URL(this.workflow_url_base)
		const port = u.port || 80
		return `${u.protocol}//${u.hostname}:${port}`
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

	//##############################################################

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
	static available = true
}

export { WebWorkflow };
