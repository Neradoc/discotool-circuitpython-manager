/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import {WORKFLOW_USERNAME, WORKFLOW_PASSWORD, DEBUG_DEFAULT} from "../../config.js";

export var hash = window.location.hash.substr(1)
export var url_params = new URLSearchParams(document.location.search)
export const DEBUG = (
	DEBUG_DEFAULT !== null ? DEBUG_DEFAULT : (
		url_params.get("debug") ? true : false
	)
)
export const current_path = url_params.get("path") || "/";

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

export async function sleep_ms(duration) {
	await new Promise(resolve => setTimeout(resolve, duration))
}
export async function sleep(duration) {
	await new Promise(resolve => setTimeout(resolve, 1000 * duration))
}
