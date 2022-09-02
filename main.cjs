/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain, nativeTheme } = require('electron')
const Store = require('electron-store');
const path = require('path')

var store = new Store()

// change the theme manually ?
// nativeTheme.themeSource = "light"
COLUMN_MODE = true
minX = 40
minY = 40

function browser_window_options(changes={}, other_changes={}) {
	var data = {
		width: 820,
		height: 800,
		minWidth: 600,
		minHeight: 600,
		webPreferences: {
			// Open all the windows with preload.cjs
			preload: path.join(__dirname, 'preload.cjs'),
			nodeIntegration: true,
			nodeIntegrationInWorker: true,
			contextIsolation: false,
		}
	}
	for(key in changes) {
		data[key] = changes[key]
	}
	for(key in other_changes) {
		data.webPreferences[key] = other_changes[key]
	}
	return data
}

function createWindow (winBounds) {
	var settings = {}
	if(COLUMN_MODE) {
		settings = { width: 350, height: 800, minWidth: 300, minHeight: 400 }
	}
	browserConfig = browser_window_options(settings)

	console.log("winBounds", winBounds)
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
	ipcMain.on('select-dirs', async (event, arg) => {
		const result = await dialog.showOpenDialog(mainWindow, {
			properties: ['openDirectory']
		})
		if(!result.canceled && result.filePaths.length > 0) {
			const dir_path = result.filePaths[0]
			const dir_url = `file://${dir_path}`
			openBoard(dir_url)
		}
	})

	mainWindow.on("resize", (e) => {
		store.set("mainWindowBounds", mainWindow.getBounds())
	})
	mainWindow.on("moved", (e) => {
		store.set("mainWindowBounds", mainWindow.getBounds())
	})
}

const board_page = "html/board-template.html"

function openBoard (url) {
	const new_window = new BrowserWindow(browser_window_options())
	new_window.loadFile(board_page, {
		query: { "dev": url }
	})

	// Open all the windows with preload.cjs ?
	new_window.webContents.setWindowOpenHandler((details) => {
		return {
			action: 'allow',
			overrideBrowserWindowOptions: browser_window_options()
		}
	})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	var winBounds = store.get("mainWindowBounds", {
		x:null,
		y:null,
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
	app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('open-board', async (event, arg) => {
	openBoard(arg.url)
})
