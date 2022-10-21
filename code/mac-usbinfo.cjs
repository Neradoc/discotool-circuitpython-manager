/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

/*
'/Volumes/PINKIE': {
    vendor_id: 9114,
    product_id: 33010,
    serial_num: 'DF60D0C5CB8D3326',
    manufacturer: 'Adafruit',
    name: 'Pinkie RP2040',
    volumes: [ { name: 'PINKIE', mount_point: '/Volumes/PINKIE' } ]
},
*/

const { exec } = require("child_process");
const drivelist = require("drivelist")
const print = console.log

sysprof = "system_profiler -json SPUSBDataType"

var devices = {}
var allMounts = {}

function readSysProfile(profile) {
	for(subGroup of profile) {
		// depth first
		if(subGroup._items) {
			readSysProfile(subGroup._items)
		}
		subGroup._items = null
		// back to the device
		var curDevice = {}
		// vid is required
		if(subGroup['vendor_id'] == undefined) {
			continue
		}
		var vid = 0
		try {
			vid = parseInt(subGroup['vendor_id'].split(" ")[0],16)
		} catch(e) {
			continue
		}
		curDevice['vendor_id'] = vid
		// product id
		var pid = 0
		try {
			pid = parseInt(subGroup['product_id'].trim().split(" ")[0],16)
		} catch(e) {
		}
		curDevice['product_id'] = pid
		// serial number is not always present
		var serial_num = ""
		if(subGroup['serial_num'] != undefined) {
			serial_num = subGroup['serial_num']
		}
		curDevice['serial_num'] = serial_num
		// manufacturer is kind of a mess sometimes
		var manufacturer = ""
		if(subGroup['manufacturer'] != undefined) {
			manufacturer = subGroup['manufacturer']
		}
		curDevice['manufacturer'] = manufacturer
		// skip the tty section
		//
		// name needs no underscore
		curDevice['name'] = subGroup['_name']
		// list the volumes now
		var deviceVolumes = {}
		if(subGroup["Media"]) {
			for(media of subGroup["Media"]) {
				if(media["volumes"]) {
					for(volume of media["volumes"]) {
						if(volume["mount_point"]) {
							var name = volume['_name']
							var mount_point = volume['mount_point']
							var add_volume = {
								'name': name,
								'mount_point': mount_point,
							}
							deviceVolumes[mount_point] = add_volume
						}
					}
				}
				if(media["bsd_name"]) {
					var disk = `/dev/${media["bsd_name"]}`
					var mount = allMounts[disk]
					if(mount != undefined && mount.mountpoints.length > 0) {
						var name = mount.mountpoints[0].label
						var mount_point = mount.mountpoints[0].path
						var add_volume = {
							'name': name,
							'mount_point': mount_point,
						}
						deviceVolumes[mount_point] = add_volume
					}
				}
			}
		}
		curDevice['volumes'] = Object.values(deviceVolumes)
		if(curDevice['volumes'].length > 0) {
			var uuid = curDevice['volumes'][0].mount_point
			devices[uuid] = curDevice
		}
	}
}

async function load_usb_info() {
	return await new Promise(resolve => {
		exec(sysprof, async (error, stdout, stderr) => {
			// ignore stderr
			if (error) {
				console.log(`error: ${error.message}`);
				return resolve(null)
			}
			const system_profile = JSON.parse(stdout)
			// goal: get the serial number of USB drives by path
			// as well as other USB information

			// print(system_profile['SPUSBDataType'])
			for(mount of await drivelist.list()) {
				allMounts[mount.device] = mount
			}

			devices = {}
			readSysProfile(system_profile['SPUSBDataType'])
			return resolve(devices)
		})
	})
}

module.exports = {
	load_usb_info,
};