/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import {BUNDLE_ACCESS, WORKFLOW_USERNAME, WORKFLOW_PASSWORD} from "./workflow-config.js";

var url_params = new URLSearchParams(document.location.search)
export const DEBUG = url_params.get("debug", false) ? true : false;
export var workflow_url_base = "http://circuitpython.local";

export function headers() {
	var username = WORKFLOW_USERNAME;
	var password = WORKFLOW_PASSWORD; // $("#password").val();
	return new Headers({
		"Authorization": 'Basic ' + btoa(username + ":" + password),
	});
}

export async function start() {
	// setup the actual URL
	const url_test = new URL("/", workflow_url_base);
	console.log(url_test);
	const response = await fetch(url_test);
	workflow_url_base = response.url;
	console.log(`Board Full URL: ${workflow_url_base}`);
}
