/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

const { shell, ipcRenderer } = require('electron')
window.modulePath = require("path")
window.moduleDrivelist = require("drivelist")
window.moduleFss = require("fs") // sync
window.moduleFs = require("fs/promises")
window.moduleFsx = require("fs-extra")
window.moduleMdns = require('multicast-dns')
window.moduleWS = require("ws")
window.moduleOS = require("os")
window.shell = shell
window.DEBUG = false

window.delayed_events = []
window.finished_loading = false

window.print_dialog = window.print
window.print = console.log
window.debug = function(...args) {
	if(window.DEBUG) {
		console.log(...args)
	}
}

window.is_windows = window.clientInformation.platform == "Win32"
if(window.is_windows) {
	const { PowerShell } = require('node-powershell')
	window.PowerShell = PowerShell
}

window.is_macos = window.clientInformation.platform.startsWith("Mac")
if(window.is_macos) {
	const { load_usb_info } = require("./mac-usbinfo.cjs")
	window.load_usb_info = load_usb_info
}

window.addEventListener('DOMContentLoaded', () => {
	const {python} = require("@codemirror/lang-python")

	window.codemirror = {
		state: require("@codemirror/state"),
		view: require("@codemirror/view"),
		commands: require("@codemirror/commands"),
		language: require("@codemirror/language"),
		search: require("@codemirror/search"),
		"python": python,
	}

	const replaceText = (selector, text) => {
		const element = document.getElementById(selector)
		if (element) element.innerText = text
	}

	for (const type of ['chrome', 'node', 'electron']) {
		replaceText(`${type}-version`, process.versions[type])
	}
	
	window.addEventListener('finished-starting', evt => {
		window.finished_loading = true
		if(window.delayed_events) {
			for(event of window.delayed_events) {
				window.dispatchEvent(event)
			}
		}
		window.delayed_events = []
	})
})

ipcRenderer.on('send-to-window', function (evt, args) {
	const event_name = args.event
	const event = new CustomEvent(event_name, { detail: args })
	if(window.finished_loading) {
		window.dispatchEvent(event)
	} else {
		window.delayed_events.push(event)
	}
})

process.once('loaded', () => {
	window.addEventListener('message', evt => {
		const data = evt.data
		try {
			const type = data.type
			ipcRenderer.send(type, evt.data)
		} catch(e) {
			console.log("IPC Error:", e)
			console.log("Event:", evt)
		}
	})
})
