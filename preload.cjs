// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const log = require('electron-log')
window.log = log.functions

const { shell, ipcRenderer } = require('electron')

window.modulePath = require("path")
window.moduleDrivelist = require("drivelist")
window.moduleFss = require("fs") // sync
window.moduleFs = require("fs/promises")
window.moduleFsx = require("fs-extra")
window.moduleMdns = require('multicast-dns')
window.shell = shell

var win = window.clientInformation.platform == "Win32"
if(win) {
	const { PowerShell } = require('node-powershell')
	window.PowerShell = PowerShell
}

window.addEventListener('DOMContentLoaded', () => {
	const replaceText = (selector, text) => {
		const element = document.getElementById(selector)
		if (element) element.innerText = text
	}

	for (const type of ['chrome', 'node', 'electron']) {
		replaceText(`${type}-version`, process.versions[type])
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
