/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import * as jq from "../extlib/jquery.min.js";
import { sleep, url_to } from "../lib/tools.js"
import * as top from "./home_top.js";
import { WebWorkflow } from "../backends/web.js";
import { USBWorkflow } from "../backends/usb.js";
import { BLEWorkflow } from "../backends/ble.js";

const BOARD_PAGE = "board_page.html"
var update_timer = null
var update_timer_running = false

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

async function insert_line(all_dev_line, name) {
	var added = false;
	for(const line of $(".board_line")) {
		const bname = $(line).find(".board_name").html()
		if(bname.localeCompare(name) >= 0) {
			$(line).before(all_dev_line)
			added = true
			break
		}
	}
	if(!added) {
		$("#all_boards_list").append(all_dev_line)
	}
}

async function detect_usb() {
	// USB workflow
	if(USBWorkflow.available) {
		$(".usb_workflow").show()
		const devices = await USBWorkflow.find_devices()
		if(devices.length == 0) {
			$("#usb_boards_list_empty").show()
		} else {
			$("#usb_boards_list_empty").hide()
			for(const device of devices) {
				var drive_path = device.mount
				var drive_name = device.name
				var url = url_to(BOARD_PAGE, {"dev": `file://${drive_path}`})
				var url_link = `${BOARD_PAGE}${url.search}`;

				var wf = new USBWorkflow(drive_path)
				await wf.start()
				const info = await wf.device_info()
				var serial = info["serial_num"] || drive_path
				const name = info["board_name"] || drive_name
				serial = serial.replaceAll(/[^a-z0-9_]+/ig, "_W")
				const line_id = `dev_line_${serial}`
				var board = null;
				if(!(serial in boards)) {
					board = new Board()
					boards[serial] = board
					board.serial = serial
					board.name = name
					var all_dev_line = template_all.clone()
					all_dev_line.prop("id", line_id)
					all_dev_line.addClass("board_line")
					await insert_line(all_dev_line, name)
				} else {
					board = boards[serial]
					while(!board.created) { sleep(0.1) }
					all_dev_line = $(`#${line_id}`)
				}
				board.usb_name = drive_name
				board.usb_path = drive_path
				var name_field = all_dev_line.find(".board_name")
				name_field.html(name)
				var link = all_dev_line.find(".link_usb")
				link.prop("href", url_link);
				link.find(".name").html(`${drive_name}`)
				link.prop("title", drive_path)
				var board_info = all_dev_line.find(".board_info")
				board_info.html(link.href)
				link.show()
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
		const devices = await WebWorkflow.find_devices()
		// candidates
		var noboard = true
		for(const device of devices) {
			// hostname: "cpy-9673a4"
			// instance_name: "Adafruit Feather ESP32-S2 TFT"
			// ip: "192.168.1.28"
			// port: 80
			var board_path = device.hostname.replace(/\.local$/, "")
			var board_name = device.instance_name
			var board_link = `http://${device.ip}:${device.port}`;
			var url = url_to(BOARD_PAGE, {"dev": board_link})
			var url_link = `${BOARD_PAGE}${url.search}`;

			var wf = new WebWorkflow(board_link)
			await wf.start()
			const info = await wf.device_info()
			const serial = await info["serial_num"] || board_path
			const name = await info["board_name"] || board_name
			const line_id = `dev_line_${serial}`
			var board = null;
			if(!(serial in boards)) {
				board = new Board()
				boards[serial] = board
				board.serial = serial
				board.name = name
				var all_dev_line = template_all.clone()
				all_dev_line.prop("id", line_id)
				all_dev_line.addClass("board_line")
				await insert_line(all_dev_line, name)
			} else {
				board = boards[serial]
				while(!board.created) { sleep(0.1) }
				all_dev_line = $(`#${line_id}`)
			}
			board.web_name = board_name
			board.web_url = board_path
			var name_field = all_dev_line.find(".board_name")
			name_field.html(name)
			var link = all_dev_line.find(".link_web")
			link.prop("href", url_link);
			link.find(".name").html(`${board_path}`)
			link.prop("title", device.ip)
			var board_info = all_dev_line.find(".board_info")
			board_info.html(link.href)
			link.show()
			if(await wf.is_editable()) {
				all_dev_line.addClass("web_editable")
				all_dev_line.removeClass("web_locked")
			} else {
				all_dev_line.removeClass("web_editable")
				all_dev_line.addClass("web_locked")
			}
			board.created = true
			all_dev_line.show()
			$("#web_boards_list_empty").hide()
			noboard = false
		}
		if(noboard) {
			$("#web_boards_list_empty").show()
		}
		$("#web_boards_loading").hide()
	} else {
		$(".web_workflow").hide()
		$("#web_boards_loading").hide()
	}
}

async function detect_ble() {
	// BLE workflow
	if(BLEWorkflow.available) {
		$(".ble_workflow").show()
		$("#ble_boards_list_empty").hide()
	} else {
		$(".ble_workflow").hide()
	}
	$("#ble_boards_loading").hide()
}

async function detect_boards() {
	if(update_timer != null) {
		clearInterval(update_timer)
		update_timer_running = false
	}
	$("#all_list_load").show()
	$(".workflow_empy").hide()
	$(".workflow_loading").show()
	$(".board_line").remove()
	boards = {}
	// async
	// do USB first, as it is fast
	// TODO: have better lock mechanisms ?
	//       to avoid race conditions so that when a device is already found
	//       with another workflow, we await until that other workflow has
	//       finished with this device.
	//       The section where the serial number is compared and the Board
	//       instance created should be a critical section.
	await detect_usb()
	await Promise.all([
		detect_ble(),
		detect_web(),
	])
	await sleep(2)
	await detect_web()
	$("#all_list_load").hide()
	$(".board_name_load").hide()
	// no await ?
	update_timer = setInterval(async () => {
		try {
			if(update_timer_running) return false
			$("#all_list_refresh").show()
			await detect_usb()
			await detect_web()
			await detect_ble()
		} catch(e) {
			console.log(e)
		}
		$("#all_list_refresh").hide()
		update_timer_running = false
	}, 10000)
}

async function init_page() {
	$("#reload_boards").on("click", detect_boards)
	await detect_boards()
}

init_page()
