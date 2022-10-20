/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import { Workflow, WorkflowResponse, WorkflowFile } from "./workflow_base.js"
const path = window.modulePath
const fsx = window.moduleFsx
const drivelist = window.moduleDrivelist
const fs = window.moduleFs
const fss = window.moduleFss

var win = null
if(window.clientInformation.platform == "Win32") {
	win = await import("./usb-win32.js")
}

const DEFAULT_DRIVE = "CIRCUITPY"

class USBWorkflow extends Workflow {
	constructor(drive = DEFAULT_DRIVE) {
		super()
		this.drive = drive.replace("file://","")
		this.root = this.drive
		this._device_info = null
		this._editable = false
		this.drive_info = null
		this.drive_name = null
	}
	async start(drive="") {
		drive = drive.replace("file://","")
		if(drive) {
			this.drive = drive
		}
		var result = await this.find_drive(this.drive)
		if(result) {
			this.drive_info = result[0]
			this.root = result[1]
			this.drive_name = result[2]
			this._editable = ! this.drive_info.isReadOnly
		}
		const dev_info = await this.device_info()
	}
	async device_info() {
		if(this._device_info !== null) {
			return this._device_info
		}

		//	"creator_id": 9114,
		//	"creation_id": 33018,

		var local_device_info = {}
		var boot_path = path.join(this.root, "boot_out.txt")
		try {
			const data = await fs.readFile(boot_path, 'utf8')
			var lines = data.split(/[\r\n]+/)
			if(lines[1].match(/^Board ID:/)) {
				var board_id = lines[1].replace(/^Board ID:/, "")
				local_device_info["board_id"] = board_id
			}
			if(lines[2].match(/^UID:/)) {
				var SN = lines[2].replace(/^UID:/, "")
				local_device_info["serial_num"] = SN
			}
			// Adafruit CircuitPython 8.0.0-alpha.1-131-gf9b9f5568 on 2022-08-11; Adafruit FunHouse with ESP32S2
			const mm = lines[0].match(/^Adafruit CircuitPython (.+) on ([0-9-]+)\s*;\s+(.*) with (.*)$/i)
			if(mm) {
				local_device_info["version"] = mm[1]
				local_device_info["build_date"] = mm[2]
				local_device_info["board_name"] = mm[3]
				local_device_info["mcu_name"] = mm[4]
			} else {
				console.log("boot out not understood")
			}
		} catch(e) {
			console.log("No boot out")
			console.log(e)
		}
		this._device_info = local_device_info
		return this._device_info
	}
	async is_editable() {
		// only valid after start()
		return this._editable
	}
	async get_file_content(file_path, range=null) {
		var full_path = path.join(this.root, file_path)
		var response = null
		try {
			const file_content = await fs.readFile(full_path, 'utf8')
			response = new WorkflowResponse(true, file_content)
		} catch(e) {
			response = new WorkflowResponse(false, null)
		}
		return response
	}
	async list_dir(dir_path) {
		if (!dir_path.endsWith("/")) {
			dir_path += "/"
		}
		var full_path = path.join(this.root, dir_path)
		var dir_list = await fs.readdir(full_path)
		var files_list = []
		for(const file_name of dir_list) {
			var file_stats = await fs.stat(path.join(full_path, file_name))
			var wf = new WorkflowFile(
				file_name,
				file_stats.isDirectory(),
				file_stats.isDirectory() ? 0 : file_stats.size,
				file_stats.mtimeMs,
				file_stats.ctimeMs
			)
			files_list.push(wf)
		}
		try {
			return new WorkflowResponse(true, files_list)
		} catch {
			return new WorkflowResponse(false, null)
		}
	}
	async upload_file(upload_path, file_content) {
		var full_path = path.join(this.root, upload_path)
		try {
			var data_buffer = await file_content.arrayBuffer()
			await fs.writeFile(full_path, Buffer.from(data_buffer))
			// file.lastModified ?
			return new WorkflowResponse(true, null)
		} catch(e) {
			console.log(e)
			console.log("Error: Cannot write to the drive")
			return new WorkflowResponse(false, null, 409, "Error: Cannot write to the drive")
		}
	}
	async create_dir(dir_path) {
		var full_path = path.join(this.root, dir_path)
		try {
			await fs.mkdir(full_path, { recursive: true })
			return new WorkflowResponse(true, null)
		} catch(e) {
			console.log(e)
			console.log("Error: Cannot write to the drive")
			return new WorkflowResponse(false, null, 409, "Error: Cannot write to the drive")
		}
	}
	async delete_file(file_path) {
		var full_path = path.join(this.root, file_path)
		try {
			await fsx.remove(full_path)
			return new WorkflowResponse(true, null)
		} catch {
			return new WorkflowResponse(false, null)
		}
	}
	async rename_file(from_path, to_path) {
		try {
			const from_full_path = path.normalize(path.join(this.root, from_path))
			const to_full_path = path.normalize(path.join(this.root, to_path))
			if(from_full_path == to_full_path) {
				return new WorkflowResponse(true, null, 204, "No changes needed.")
			}
			const paths_valid = (
				from_full_path.startsWith(this.root)
				&& to_full_path.startsWith(this.root)
			)
			if(!paths_valid) {
				return new WorkflowResponse(false, null, 500, "Path outside of the target drive.")
			}
			await fsx.move(from_full_path, to_full_path)
			return new WorkflowResponse(true, null)
		} catch(e) {
			console.log(e)
			return new WorkflowResponse(false, null)
		}
		return new WorkflowResponse(false, null, 500, "ERROR")
	}
	api_url(file_path) {
		var full_path = path.join(this.root, file_path)
		return new URL(`file://${full_path}`)
	}
	edit_url(file_path) {
		var full_path = path.join(this.root, file_path)
		return new URL(`file://${full_path}`)
	}
	repl_url() {
		return ""
	}
	async get_identifier() {
		return this.drive_name
	}
	async get_board_url() {
		return `file://${this.root}`
	}

	//##############################################################

	static async find_devices() {
		var drives = await drivelist.list()
		var devices_list = []
		for(var drive of drives) {
			if(!drive.isRemovable) continue
			if(!drive.isUSB) continue
			for(const mount of drive.mountpoints) {
				var root = mount.path
				var boot_path = path.join(root, "boot_out.txt")
				if(fss.existsSync(boot_path)) {
					var label = mount.label
					if(win) {
						label = await win.drive_label_by_letter(root)
					}
					devices_list.push({
						mount: root,
						name: label,
					})
				}
			}
		}
		return devices_list
	}

	//##############################################################

	async find_drive(needle) {
		// find in actual drives
		const drives = await drivelist.list()
		for(var drive of drives) {
			if(!drive.isRemovable) continue
			if(!drive.isUSB) continue
			for(var mount of drive.mountpoints) {
				if(mount.path == needle) {
					return [drive, needle, mount.label]
				}
				if(mount.label == needle) {
					return [drive, mount.path, mount.label]
				}
			}
		}
		// if this is an existing directory with boot_out.txt
		var boot_path = path.join(needle, "boot_out.txt")
		if(fss.existsSync(boot_path)) {
			const label = path.basename(needle)
			const drive = window.moduleFss.statSync(needle)
			return [drive, needle, label]
		}
		return null
	}
	icon = "&#128190;"
	type = "usb"
	supports_credentials = false
	static available = (path !== undefined)
}

export { USBWorkflow }
