/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import * as common from "../main/common.js";
import * as jq from "../extlib/jquery.min.js";
import { WebWorkflow } from "../backends/web.js";
import { USBWorkflow } from "../backends/usb.js";

const board_page = "board_page.html"

async function init_page() {
	// $("h3").html(window.location.href).show()
	// USB workflow
	if(false && window.modulePath != undefined) {
		const response = await USBWorkflow.find_devices()
		const devices = response.devices
		const template = $("#template_board_usb")
		template.remove()
		if(devices.length == 0) {
			
		} else {
			$("#usb_workflow_list .boards_list_empty").hide()
			for(const device of devices) {
				var drive_path = device.mount
				var drive_name = device.name
				var dev_line = template.clone()
				dev_line.attr("id", "")
				var link = dev_line.find(".board_link")
				var url = common.url_to(board_page, {"dev": `file://${drive_path}`})
				var url_link = `${board_page}${url.search}`;
				link.attr("href", `${board_page}${url.search}`);
				link.html(drive_name)
				var board_info = dev_line.find(".board_info")
				board_info.html(link.href)
				$("#usb_workflow_list").append(dev_line)
				dev_line.show(1000)
			}
			$("#usb_workflow_list .board_link").each((i,a) => {
				console.log(i,a)
			});
		}
		$("#usb_workflow_list").removeClass("loading")
	} else {
		$(".usb_workflow").hide()
	}
	// Web workflow
	if(true) {
		const response = await WebWorkflow.find_devices()
		const template = $("#template_board_web")
		template.remove()

		if(response && response.total > 0) {
			$("#web_workflow_list .boards_list_empty").hide()
			const devices = response.devices
			for(const device of devices) {
				// hostname: "cpy-9673a4"
				// instance_name: "Adafruit Feather ESP32-S2 TFT"
				// ip: "192.168.1.28"
				// port: 80
				console.log(device)
				var board_path = device.hostname
				var board_name = device.instance_name
				var dev_line = template.clone()
				dev_line.attr("id", "")
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
		$(".some_load_image").hide()
		$("#web_workflow_list").removeClass("loading")
	} else {
		$(".web_workflow").hide()
	}
}

init_page();
