/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

var url_params = new URLSearchParams(document.location.search)
var DEBUG = url_params.get("debug", false) ? true : false;
var workflow_url_base = "http://circuitpython.local";

function headers() {
	var username = "";
	var password = "123456"; // $("#password").val();
	return new Headers({
		"Authorization": 'Basic ' + btoa(username + ":" + password),
	});
}

async function start() {
	// setup the actual URL
	const url_test = new URL("/", workflow_url_base);
	console.log(url_test);
	const response = await fetch(url_test);
	workflow_url_base = response.url;
	console.log(`Board Full URL: ${workflow_url_base}`);
}
