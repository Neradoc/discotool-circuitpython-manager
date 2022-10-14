/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain, nativeTheme } = require('electron')
const Store = require('electron-store');
const path = require('path')

var store = new Store()
var all_windows = new Set()

// change the theme manually ?
// nativeTheme.themeSource = "light"
minX = 40
minY = 40

COLUMN_MODE = true
HOME_WIN_CONFIG = {
	width: 350,
	height: 800,
	minWidth: 300,
	minHeight: 400,
}
BOARD_WIN_CONFIG = {
}
EDITOR_WIN_CONFIG = {
}
SERIAL_WIN_CONFIG = {
	minWidth: 350,
	minHeight: 300,
}

const board_page = "html/board-template.html"
const editor_page = "html/editor-template.html"
const serial_page = "html/serial-template.html"
const preload_script = 'preload.cjs'

function browser_window_options(changes={}, prefs_changes={}) {
	var data = {
		// these are the defaults for board windows basically
		width: 820,
		height: 800,
		minWidth: 600,
		minHeight: 600,
		webPreferences: {
			// Open all the windows with preload.cjs
			preload: path.join(__dirname, preload_script),
			nodeIntegration: true,
			nodeIntegrationInWorker: true,
			contextIsolation: false,
		}
	}
	for(key in changes) {
		data[key] = changes[key]
	}
	for(key in prefs_changes) {
		data.webPreferences[key] = prefs_changes[key]
	}
	return data
}

function window_for_url(board_url) {
	for(test_window of all_windows) {
		if(test_window.board_url && test_window.board_url == board_url) {
			test_window.focus()
			return test_window
		}
	}
	return false
}

function createWindow (winBounds) {
	var browserConfig = browser_window_options(HOME_WIN_CONFIG)

	if(winBounds !== undefined) {
		if(typeof(winBounds.width) == 'number') {
			browserConfig.width = Math.max(winBounds.width, browserConfig.minWidth)
		}
		if(typeof(winBounds.height) == 'number') {
			browserConfig.height = Math.max(winBounds.height, browserConfig.minHeight)
		}
		if(typeof(winBounds.x) == 'number') {
			browserConfig.x = Math.max(winBounds.x, minX)
		}
		if(typeof(winBounds.y) == 'number') {
			browserConfig.y = Math.max(winBounds.y, minY)
		}
	}

	// Create the browser window.
	const mainWindow = new BrowserWindow(browserConfig)

	// and load the index.html of the app.
	mainWindow.loadFile('index.html')

	mainWindow.webContents.setWindowOpenHandler((details) => {
		return {
			action: 'allow',
			overrideBrowserWindowOptions: browser_window_options()
		}
	})

	// listen for the "open directory" dialog and do something with it
	ipcMain.on('open-board-directory', async (event, arg) => {
		const result = await dialog.showOpenDialog(mainWindow, {
			properties: ['openDirectory']
		})
		if(!result.canceled && result.filePaths.length > 0) {
			const dir_path = result.filePaths[0]
			const dir_url = `file://${dir_path}`
			openBoard({"device": dir_url})
		}
	})

	ipcMain.on('open-directory-dialog', async (event, arg) => {
		var dialog_args = {
			buttonLabel: 'Save',
			properties: ['openDirectory', "createDirectory"],
		}
		if(arg.save_path) {
			dialog_args.defaultPath = arg.save_path
		}
		const result = await dialog.showOpenDialog(dialog_args)
		console.log(result)
		if(!result.canceled && result.filePaths.length > 0) {
			const dir_path = result.filePaths[0]
			console.log(all_windows)
			for(a_window of all_windows) {
				console.log(a_window)
				console.log(arg)
				a_window.webContents.send("send-to-window", {
					...arg,
					"dir_path": dir_path,
					"event": arg.return_event,
				})
			}
		}
	})

	mainWindow.on("resize", (e) => {
		store.set("mainWindowBounds", mainWindow.getBounds())
	})
	mainWindow.on("moved", (e) => {
		store.set("mainWindowBounds", mainWindow.getBounds())
	})

	all_windows.add(mainWindow)
	return mainWindow
}

function openBoard (args) {
	url = args.device
	var win = window_for_url(url)
	if(win) { return win }

	const new_window = new BrowserWindow(browser_window_options(BOARD_WIN_CONFIG))
	new_window.board_url = url
	new_window.loadFile(board_page, {
		query: { "device": url }
	})

	// Open all the windows with preload.cjs ?
	new_window.webContents.setWindowOpenHandler((details) => {
		return {
			action: 'allow',
			overrideBrowserWindowOptions: browser_window_options()
		}
	})
	// put it in the list
	all_windows.add(new_window)
	return new_window
}

function openFileEditor(args) {
	var query_args = Object.assign({}, args)
	delete query_args.type
	// { "device": dev_url, "file": file_path }

	const identifier = "Editor:" + JSON.stringify([
		query_args.device, query_args.file,
	])
	var win = window_for_url(identifier)
	if(win) { return win }

	const new_window = new BrowserWindow(browser_window_options(EDITOR_WIN_CONFIG))
	new_window.board_url = identifier
	new_window.loadFile(editor_page, { query: query_args })

	// Open all the windows with preload.cjs ?
	new_window.webContents.setWindowOpenHandler((details) => {
		return {
			action: 'allow',
			overrideBrowserWindowOptions: browser_window_options()
		}
	})
	// put it in the list
	all_windows.add(new_window)
	return new_window
}

function openSerial(args) {
	var query_args = Object.assign({}, args)
	delete query_args.type
	// { "device": dev_url }

	const identifier = "Serial:" + JSON.stringify(query_args)
	var win = window_for_url(identifier)
	if(win) { return win }

	const new_window = new BrowserWindow(browser_window_options(SERIAL_WIN_CONFIG))
	new_window.board_url = identifier
	new_window.loadFile(serial_page, { query: query_args })

	// Open all the windows with preload.cjs ?
	new_window.webContents.setWindowOpenHandler((details) => {
		return {
			action: 'allow',
			overrideBrowserWindowOptions: browser_window_options()
		}
	})
	// put it in the list
	all_windows.add(new_window)
	return new_window
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	var winBounds = store.get("mainWindowBounds", {
		x: null,
		y: null,
		width: 0,
		height: 0,
	})
	createWindow(winBounds)

	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow(winBounds)
	})
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
	// if (process.platform !== 'darwin')
	if(all_windows.size == 0) {
		app.quit()
	}
})

app.on("browser-window-created", function(event, new_window) {
	//
	new_window.on("close", (e) => {
		all_windows.delete(e.sender)
	})
})

ipcMain.on('open-board', async (event, arg) => {
	new_window = openBoard(arg)
	if("install" in arg) {
		new_window.webContents.send("send-to-window", {
			...arg,
			event: "install-modules",
		})
	}
})

ipcMain.on('open-file-editor', async (event, arg) => {
	new_window = openFileEditor(arg)
	new_window.webContents.send("send-to-window", {
		...arg,
		event: "opened-editor",
	})
})

ipcMain.on('open-serial-panel', async (event, arg) => {
	openSerial(arg)
})
