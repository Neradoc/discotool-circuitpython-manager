/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import {WORKFLOW_USERNAME, WORKFLOW_PASSWORD} from "../../config.js";
import { WebWorkflow } from "../backends/web.js";
import { USBWorkflow } from "../backends/usb.js";

export var hash = window.location.hash.substr(1);
export var url_params = new URLSearchParams(document.location.search)

export const DEBUG = url_params.get("debug") ? true : false;
export const current_path = url_params.get("path") || "/";

export var board_control = null

export async function start() {
	var url = new URL(window.location);
	var url_passed = url.searchParams.get("dev");

	if (url_passed.startsWith("file://")) {
		var target_drive = url_passed.replace(/^file:\/\//, "")
		board_control = new USBWorkflow(target_drive);
	} else if (url_passed.startsWith("ble:")) {
		console.log("BLE workflow not supported")
	} else if (url_passed.startsWith("http://")) {
		// var target_url = url_passed.replace(/^http:\/\//, "")
		board_control = new WebWorkflow(url_passed);
	}

}

export function url_here(parameters = {}, hash = null) {
	var url = new URL(window.location);
	for(var key in parameters) {
		url.searchParams.set(key, parameters[key]);
	}
	if(hash != null) {
		url.hash = `#${hash}`;
	}
	return url;
}

export function url_to(path, parameters, hash=null) {
	var url = new URL(path, window.location);
	for(var key in parameters) {
		url.searchParams.set(key, parameters[key]);
	}
	if(hash != null) {
		url.hash = `#${hash}`;
	}
	return url;
}
