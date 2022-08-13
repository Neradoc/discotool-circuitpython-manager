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

// export var backend = new WebWorkflow();
export var backend = new USBWorkflow();

export async function start() {
	// nothing
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
