/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
async function runPS(cmd) {
	var result = await PowerShell.invoke(cmd)
	return result.raw
}

async function get_command(command) {
	result = await runPS(command)
	blocks = result.split("\r\n\r\n")
	pastKey = ""
	all_blocks = []
	for(block of blocks) {
		block = block.trim()
		if(block == "") continue
		block_data = {}
		for(line of block.split("\r\n")) {
			if (line[0] == " " || !line.includes(":")) {
				block_data[pastKey] += line.trim()
			} else {
				var parts = line.split(":")
				key = parts.shift().trim()
				value = parts.join(":").trim()
				pastKey = key
				if(value) {
					block_data[key] = value
				}
			}
		}
		all_blocks.push(block_data)
	}
	return all_blocks
}

export async function drive_label_by_letter(letter) {
	letter = letter.replaceAll(/[^a-z0-9 ]/ig,"")
	if(letter == "") return ""
	return await runPS(`(Get-Volume -DriveLetter ${letter}).FileSystemLabel`)
}
