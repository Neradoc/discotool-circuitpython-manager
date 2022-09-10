/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import {WORKFLOW_USERNAME, WORKFLOW_PASSWORD} from "../../config.js";
import { WebWorkflow } from "../backends/web.js";
import { USBWorkflow } from "../backends/usb.js";

export const is_electron = window && window.process && window.process.type == "renderer"

export var library_bundle = null;
export var board_control = null
export async function start() {
	var url = new URL(window.location);
	var url_passed = url.searchParams.get("device") || "";

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
export function set_library_bundle(bundle) {
	library_bundle = bundle
}
