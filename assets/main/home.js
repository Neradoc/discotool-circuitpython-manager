/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import * as common from "../main/common.js";
import * as jq from "../extlib/jquery.min.js";
import { WebWorkflow } from "../backends/web.js";
import { USBWorkflow } from "../backends/usb.js";

const board_page = "board_page.html"

async function detect_usb() {
	// USB workflow
	if(window.modulePath != undefined) {
		$(".usb_workflow").show()
		const response = await USBWorkflow.find_devices()
		const devices = response.devices
		const template = $("#template_board_usb")
		if(devices.length == 0) {
			$("#usb_workflow_list .boards_list_empty").show()
		} else {
			$("#usb_workflow_list .boards_list_empty").hide()
			for(const device of devices) {
				var drive_path = device.mount
				var drive_name = device.name
				var dev_line = template.clone()
				dev_line.attr("id", "")
				dev_line.addClass("board_line")
				var link = dev_line.find(".board_link")
				var url = common.url_to(board_page, {"dev": `file://${drive_path}`})
				var url_link = `${board_page}${url.search}`;
				link.attr("href", `${board_page}${url.search}`);
				link.html(drive_name)
				var board_info = dev_line.find(".board_info")
				board_info.html(link.href)
				$("#usb_workflow_list").append(dev_line)
				dev_line.show()
			}
		}
		$("#usb_workflow_list").removeClass("loading")
	} else {
		$(".usb_workflow").hide()
	}
	console.log("FIN USB")
}

async function giveup_web() {
	console.log("ERROR: Detect Web")
	console.log(e)
	$(".web_workflow").show()
	$("#web_workflow_list .boards_list_empty").show()
	$("#web_workflow_list").removeClass("loading")
}

async function detect_web() {
	// Web workflow
	if(true) {
		$(".web_workflow").show()
		var response = null
		try {
			response = await WebWorkflow.find_devices()
		} catch(e) {
			return giveup_web(e)
		}
		const template = $("#template_board_web")
		if(response && response.total > 0) {
			$("#web_workflow_list .boards_list_empty").hide()
			const devices = response.devices
			for(const device of devices) {
				// hostname: "cpy-9673a4"
				// instance_name: "Adafruit Feather ESP32-S2 TFT"
				// ip: "192.168.1.28"
				// port: 80
				var board_path = device.hostname
				var board_name = device.instance_name
				var dev_line = template.clone()
				dev_line.attr("id", "")
				dev_line.addClass("board_line")
				var link = dev_line.find(".board_link")
				var url = common.url_to(board_page, {"dev": `http://${device.ip}:${device.port}`})
				var url_link = `${board_page}${url.search}`;
				link.attr("href", `${board_page}${url.search}`);
				link.html(`${board_name} (${board_path})`)
				var board_info = dev_line.find(".board_info")
				board_info.html(link.href)
				$("#web_workflow_list").append(dev_line)
				dev_line.show()
			}
		} else {
			$("#web_workflow_list .boards_list_empty").show()
		}
		$("#web_workflow_list").removeClass("loading")
	} else {
		$(".web_workflow").hide()
	}
	console.log("FIN WEB")
}

async function detect_ble() {
	// BLE workflow
	if(true) {
		$(".ble_workflow").show()
		$("#ble_workflow_list .boards_list_empty").hide()
	} else {
		$(".ble_workflow").hide()
	}
	console.log("FIN BLE")
}

async function detect_boards() {
	$(".workflow_list").addClass("loading")
	$(".board_line").remove()
	// async
	var promises = Promise.all([
		detect_usb(),
		detect_web(),
		detect_ble(),
	])
	// no await ?
}

async function init_page() {
	$("#reload_boards").on("click", detect_boards)
	await detect_boards()
}

init_page();
