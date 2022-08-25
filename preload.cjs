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

// window.BrowserWindow = BrowserWindow
// window.dialog = dialog

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
		console.log("message")
		console.log(evt)
		console.log(evt.data)

		if (evt.data.type === 'select-dirs') {
			console.log("select-dirs", evt.data)
			ipcRenderer.send('select-dirs', evt.data)
		}
		if (evt.data.type === 'open-board') {
			console.log("open-board", evt.data)
			ipcRenderer.send('open-board', evt.data)
		}
	})
})
