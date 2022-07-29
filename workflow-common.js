/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import {WORKFLOW_USERNAME, WORKFLOW_PASSWORD} from "./workflow-config.js";

export var hash = window.location.hash.substr(1);
export var url_params = new URLSearchParams(document.location.search)
export var workflow_url_base = "http://circuitpython.local";

export const DEBUG = url_params.get("debug") ? true : false;
export const current_path = url_params.get("path") || "/";

export function headers() {
	var username = WORKFLOW_USERNAME;
	var password = WORKFLOW_PASSWORD;
	var password_field = $("#password").val();
	if (password_field) {
		password = password_field;
	} else if (WORKFLOW_PASSWORD == null) {
		alert("The workflow password must be set.");
		$(".tab_link_home").click();
	}
	// throw 'This is not used anymore !';
	var encoded = btoa(username + ":" + password);
	return new Headers({
		"Authorization": 'Basic ' + encoded,
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
