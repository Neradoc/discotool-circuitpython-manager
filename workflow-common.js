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

export function headers(others=null) {
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

export async function start() {
	// setup the actual URL
	const url_test = new URL("/", workflow_url_base);
	console.log(`Common Start ${url_test}`);
	const response = await fetch(url_test);
	workflow_url_base = response.url;
	console.log(`Board URL: ${workflow_url_base}`);
}
