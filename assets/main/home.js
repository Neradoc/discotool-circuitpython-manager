/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import * as common from "../main/common.js";
import * as jq from "../extlib/jquery.min.js";
import { WebWorkflow } from "../backends/web.js";
import { USBWorkflow } from "../backends/usb.js";

const board_page = "board_page.html"

async function sleep(duration) {
	await new Promise(resolve => setTimeout(resolve, duration))
}

class Board {
	constructor() {
		this.serial = "";
		this.name = "";
		this.created = false;
		this.usb_name = "";
		this.usb_path = "";
		this.web_name = "";
		this.web_url = "";
		this.action = new Promise(() => {});
	}
	next(callback) {
		this.action = this.action.then(callback)
		return this.action
	}
}

var boards = {};
const template_all = $("#template_board_all")

async function detect_usb() {
	// USB workflow
	if(window.modulePath != undefined) {
		$(".usb_workflow").show()
		const response = await USBWorkflow.find_devices()
		const devices = response.devices
		if(devices.length == 0) {
			$("#usb_boards_list_empty").show()
		} else {
			$("#usb_boards_list_empty").hide()
			for(const device of devices) {
				var drive_path = device.mount
				var drive_name = device.name
				var url = common.url_to(board_page, {"dev": `file://${drive_path}`})
				var url_link = `${board_page}${url.search}`;

				var wf = new USBWorkflow(drive_path)
				await wf.start()
				const info = await wf.device_info()
				const serial = await info["serial_num"] || drive_path
				const name = await info["board_name"] || drive_name
				const line_id = `dev_line_${serial}`
				var board = null;
				if(!(serial in boards)) {
					board = new Board()
					boards[serial] = board
					console.log(serial)
					board.serial = serial
					board.name = name
					var all_dev_line = template_all.clone()
					all_dev_line.attr("id", line_id)
					all_dev_line.addClass("board_line")
					$("#all_boards_list").append(all_dev_line)
				} else {
					board = boards[serial]
					while(!board.created) { sleep(100) }
					all_dev_line = $(`#${line_id}`)
				}
				board.usb_name = drive_name
				board.usb_path = drive_path
				var name_field = all_dev_line.find(".board_name")
				name_field.html(name)
				var link = all_dev_line.find(".board_link_usb")
				link.attr("href", url_link);
				link.html(`${drive_path}`)
				var board_info = all_dev_line.find(".board_info")
				board_info.html(link.href)
				all_dev_line.find(".link_usb").show()
				if(await wf.is_editable()) {
					all_dev_line.addClass("usb_editable")
					all_dev_line.removeClass("usb_locked")
				} else {
					all_dev_line.removeClass("usb_editable")
					all_dev_line.addClass("usb_locked")
				}
				board.created = true
				all_dev_line.show()
			}
		}
		$("#usb_boards_loading").hide()
	} else {
		$(".usb_workflow").hide()
		$("#usb_boards_loading").hide()
	}
	console.log("FIN USB")
}

async function giveup_web(e) {
	console.log("ERROR: Detect Web")
	console.log(e)
	$(".web_workflow").show()
	$("#web_boards_list_empty").show()
	$("#web_boards_loading").hide()
}

async function detect_web() {
	// Web workflow
	if(true) {
		// $(".web_workflow").show()
		var response = null
		try {
			response = await WebWorkflow.find_devices()
		} catch(e) {
			return giveup_web(e)
		}
		if(response && response.total > 0) {
			$("#web_boards_list_empty").hide()
			const devices = response.devices
			for(const device of devices) {
				// hostname: "cpy-9673a4"
				// instance_name: "Adafruit Feather ESP32-S2 TFT"
				// ip: "192.168.1.28"
				// port: 80
				var board_path = device.hostname
				var board_name = device.instance_name
				var board_link = `http://${device.ip}:${device.port}`;
				var url = common.url_to(board_page, {"dev": board_link})
				var url_link = `${board_page}${url.search}`;

				var wf = new WebWorkflow(board_link)
				await wf.start()
				const info = await wf.device_info()
				const serial = await info["serial_num"] || board_path
				const name = await info["board_name"] || board_name
				const line_id = `dev_line_${serial}`
				console.log("WEB WORKFLOW - WEB WORKFLOW - WEB WORKFLOW")
				console.log(info)
				console.log(serial)
				var board = null;
				if(!(serial in boards)) {
					board = new Board()
					boards[serial] = board
					console.log(serial)
					board.serial = serial
					board.name = name
					var all_dev_line = template_all.clone()
					all_dev_line.attr("id", line_id)
					all_dev_line.addClass("board_line")
					$("#all_boards_list").append(all_dev_line)
				} else {
					board = boards[serial]
					while(!board.created) { sleep(100) }
					all_dev_line = $(`#${line_id}`)
				}
				board.web_name = board_name
				board.web_url = board_path
				var name_field = all_dev_line.find(".board_name")
				name_field.html(name)
				var link = all_dev_line.find(".board_link_web")
				link.attr("href", url_link);
				var port = (device.port == 80) ? "" : device.port
				link.html(`http://${board_path}.local${port}`)
				var board_info = all_dev_line.find(".board_info")
				board_info.html(link.href)
				all_dev_line.find(".link_web").show()
				if(await wf.is_editable()) {
					all_dev_line.addClass("web_editable")
					all_dev_line.removeClass("web_locked")
				} else {
					all_dev_line.removeClass("web_editable")
					all_dev_line.addClass("web_locked")
				}
				board.created = true
				all_dev_line.show()
			}
		} else {
			$("#web_boards_list_empty").show()
		}
		$("#web_boards_loading").hide()
	} else {
		$(".web_workflow").hide()
		$("#web_boards_loading").hide()
	}
	console.log("FIN WEB")
}

async function detect_ble() {
	// BLE workflow
	if(true) {
		$(".ble_workflow").show()
		$("#ble_boards_list_empty").hide()
	} else {
		$(".ble_workflow").hide()
	}
	$("#ble_boards_loading").hide()
	console.log("FIN BLE")
}

async function detect_boards() {
	$("#all_list_load").show()
	$(".workflow_empy").hide()
	$(".workflow_loading").show()
	$(".board_line").remove()
	boards = {}
	// async
	// do USB first, as it is fast
	// TODO: have some lock mechanism:
	//       to avoid race conditions so that when a device is already found
	//       with another workflow, we await until that other workflow has
	//       finished with this device.
	//       The section where the serial number is compared and the Board
	//       instance created should be a critical section.
	await detect_usb()
	var promises = Promise.all([
		detect_web(),
		detect_ble(),
	]).then(() => {
		$("#all_list_load").hide()
		$(".board_name_load").hide()
	})
	// no await ?
}

async function init_page() {
	$("#reload_boards").on("click", detect_boards)
	await detect_boards()
}

init_page();
