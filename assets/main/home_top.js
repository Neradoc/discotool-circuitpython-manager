/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

const fs = window.moduleFs
const fss = window.moduleFss

var hoverer = null
function update_hovered() {
	if(hoverer !== null) {
		clearTimeout(hoverer)
		hoverer = null
	}
	$(".drop_zone").addClass("being_hovered")
	hoverer = setTimeout(() => {
		$(".drop_zone").removeClass("being_hovered")
	}, 1000)
}

async function look_at_files(files_dropped) {
	if(files_dropped.length > 0) {
		var file  = files_dropped[0]
		if(fss.existsSync(file.path)) {
			var file_stats = await fs.stat(file.path)
			if(file_stats.isDirectory()) {
				var link = `file://${file.path}`
				window.postMessage({
					type: 'open-board',
					device: link,
				})
			}
		}
	}
}

$(document).on("change", "#select_files_input", (event) => {
	var that = event.target
	var dropped_files_list = []
	for(var idx=0; idx < that.files.length; ++idx) {
		var file = that.files[idx]
		dropped_files_list.push(file)
	}
	look_at_files(dropped_files_list)
})

$(document).on("click", "#file_select_button", (e) => {
	window.postMessage({
		type: 'open-board-directory'
	})
})

$(window).on("drop", (event) => {
	event.stopPropagation()
	event.preventDefault()
	var dropped_files_list = []

	$(".drop_zone").removeClass("being_hovered")

	var data_transfer = event.originalEvent.dataTransfer
	if (data_transfer.items) {
		// Use DataTransferItemList interface to access the file(s)
		for (var i = 0; i < data_transfer.items.length; i++) {
			// If dropped items aren't files, reject them
			if (data_transfer.items[i].kind === 'file') {
				var file = data_transfer.items[i].getAsFile()
				dropped_files_list.push(file)
			}
		}
	} else {
		// Use DataTransfer interface to access the file(s)
		for (var i = 0; i < data_transfer.files.length; i++) {
			var file = data_transfer.files[i]
			dropped_files_list.push(file)
		}
	}
	look_at_files(dropped_files_list)
	return false
})
$(window).on("dragenter", (event) => {
	update_hovered()
	event.stopPropagation()
	event.preventDefault()
})
$(window).on("dragexit", (event) => {
	$(".drop_zone").removeClass("being_hovered")
	event.stopPropagation()
	event.preventDefault()
})
$(window).on("dragover", (event) => {
	update_hovered()
	event.stopPropagation()
	event.preventDefault()
})

$("#web_open_panel .web_go").on("click", (e) => {
	const target = $("#web_open_panel .web_input").val()
	var link = `http://${target}`
	window.postMessage({
		type: 'open-board',
		device: link,
	})
})
