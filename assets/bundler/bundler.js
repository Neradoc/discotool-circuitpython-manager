/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import { LibraryBundle } from "../lib/bundle.js"
const BUNDLE_ACCESS = "proxy:https://neradoc.me/bundler/proxy.php"
var DEBUG = true
var library_bundle = new LibraryBundle(BUNDLE_ACCESS)

/***************************************************************
*** NOTE THE UI PART
*/

// the zip code is running, the button won't respond
var zipping = false
// list of files added to the drop zone
var dropped_files_list = []
// list of modules found in the files
var dropped_modules_list = []
// limit to the list of files names before cut to "..."
var MAX_FILE_NAMES = 80
// the prefix is added to file paths inside the zip (add "/" for a folder)
var ZIP_PREFIX = "CIRCUITPY/"
// README.txt file added to the zip
var README = `Circuitpython Libraries Bundle

Copy the files and directories in this bundle from the "lib" directory
into the target board's "lib" directory inside the CIRCUITPY drive.

More information on Circuitpython librairies:
https://circuitpython.org/libraries
`

/***************************************************************
*** NOTE Colorize list of modules
*/

function color_the_lists() {
	function color_list(i,that) {
		$(that).removeClass("pair0")
		$(that).removeClass("pair1")
		$(that).addClass(`pair${i%2}`)
	}
	$("#modules p:visible").each(color_list)
	$("#dependencies p:visible").each(color_list)
}

/***************************************************************
*** NOTE Manage the dependencies list
*/

function update_dependencies_list() {
	var modules_list = []
	$("#modules .selected .module").each((i,that) => {
		var module = $(that).html()
		library_bundle.get_dependencies([module], modules_list)
	})
	library_bundle.get_dependencies(dropped_modules_list, modules_list)
	modules_list.sort()
	$("#dependencies").html("")
	var pair = 0
	for(var index in modules_list) {
		pair = pair + 1
		var module_name = modules_list[index]
		var module = library_bundle.get_module(module_name)
		if(module === false) { continue; } // skip external modules
		var ext = ""
		if(!module.package) {
			ext = ".mpy"
		}
		$("#dependencies").append(
			`<p class="pair${pair%2}"><span class="module">${module.name}</span>${ext}</p>`
		)
	}
	$(".num_deps").html(pair)
	$("#zip_link").hide()
	$("#zip_in_progress").hide()
}

/***************************************************************
*** NOTE Filter modules by name
*/

function filter_the_modules() {
	var that = $("#filter input")
	var search_string = that.val().trim()
	if(search_string == "") {
		$("#clear_search").removeClass("enabled")
		$("#modules p").show()
		color_the_lists()
		return
	}
	$("#clear_search").addClass("enabled")
	var list_search = search_string.split(" ").filter(i => i)
	$("#modules p").each((i,item) => {
		var module_name = $(item).children(".module").html()
		var matches = false
		list_search.forEach((sstring) => {
			if(module_name.match(sstring)) {
				matches = true
			}
		})
		if(!matches) {
			$(item).hide()
		} else {
			$(item).show()
		}
	})
	color_the_lists()
}

$(document).on("keyup", "#filter input", (event) => {
	filter_the_modules()
})

$(document).on("click", "#clear_search", (event) => {
	$("#filter input").val("")
	filter_the_modules()
})

/***************************************************************
*** NOTE Manually select and deselect modules
*/

function toggle_deselect() {
	var nselected = $(".selected").length
	if(nselected > 0) {
		$("#deselect_all").addClass("enabled")
		$("#nselected").html(`(${nselected} selected)`)
	} else {
		$("#deselect_all").removeClass("enabled")
		$("#nselected").html("")
	}
}

$(document).on("click", "#modules p", (event) => {
	// "this" should work but doesn't, "target" can be the internal span or img
	var that = $(event.target).parents().addBack().filter("#modules p")
	var checkbox = that.find(".checkbox")
	if(!zipping) {
		that.toggleClass("selected")
		update_dependencies_list()
		toggle_deselect()
	}
	checkbox.prop("checked", that.hasClass("selected"))
})

$(document).on("click", "#deselect_all", (event) => {
	if(zipping) return
	$(".selected").removeClass("selected")
	$("#modules p .checkbox").prop("checked", false)
	update_dependencies_list()
	toggle_deselect()
})

/***************************************************************
*** NOTE Zip generating stuff
*/

async function async_zipit() {
	var output_zip = new JSZip()

	// readme file
	await output_zip.file(ZIP_PREFIX + "README.txt", README)
	var modules_bom = $("#dependencies p .module")

	var total_zip_files = modules_bom.length + dropped_files_list.length
	var zip_files_progress = 0

	function count_one_file() {
		zip_files_progress += 1
		// in case the math is weird:
		zip_files_progress = Math.min(zip_files_progress, total_zip_files)
		$("#zip_in_progress .file_progress").html(
			`${zip_files_progress}&nbsp;/`
			+ `&nbsp;${total_zip_files}`
		)
	}

	for(var index = 0; index < modules_bom.length; ++index) {
		count_one_file()

		var item = modules_bom[index]
		var module_name = $(item).html()
		var module = library_bundle.all_the_modules[module_name]
		var zip_contents = await library_bundle.get_bundle_module_contents(module)
		var bundle_path = ""

		bundle_path = Object.keys(zip_contents.files)[0].split("/")[0]+"/lib"

		if(module.package) {
			var new_dir_name = `lib/${module_name}`
			await output_zip.folder(ZIP_PREFIX + new_dir_name)
			// loop through the subfiles in zip_contents and add them
			var zip_folder = await zip_contents.folder(`${bundle_path}/${module_name}/`)
			if(zip_folder == null) {
				console.log("NULL ??? zip_folder is NULL !")
			}
			var subliste = []
			await zip_folder.forEach((relativePath, file) => {
				subliste.push(file)
			})
			for(var idx in subliste) {
				var file = subliste[idx]
				var out_file_name = file.name.replace(`${bundle_path}`, "lib")
				var zip_file = await zip_contents.file(file.name)
				if (zip_file !== null) {
					var zip_data = await zip_file.async("uint8array")
					await output_zip.file(ZIP_PREFIX + out_file_name, zip_data)
				} else {
					console.log("NULL ???", file.name)
				}
			}
		} else {
			var in_file_name = `${bundle_path}/${module_name}.mpy`
			var out_file_name = `lib/${module_name}.mpy`
			var zip_file = await zip_contents.file(in_file_name)
			if (zip_file !== null) {
				var zip_data = await zip_file.async("uint8array")
				await output_zip.file(ZIP_PREFIX + out_file_name, zip_data)
			} else {
				console.log("NULL ???", in_file_name)
			}
		}
	}
	for(var idx in dropped_files_list) {
		count_one_file()
		var file = dropped_files_list[idx]
		await output_zip.file(ZIP_PREFIX + file.name, file)
	}
	$("#zip_in_progress .preparing").show()
	return await output_zip.generateAsync({type:"base64"})
}

function zipit() {
	if(zipping) return false
	if($("#dependencies p").length == 0) return false
	zipping = true
	$("#zip_in_progress .preparing").hide()
	$("#zip_in_progress").show()
	$("#zip_link").hide()
	$("#zip_popup .close").hide()
	$("#zip_popup").show()
	// start the following as an async
	async_zipit().then(async (base64) => {
		// hide "in progress"
		var data_url = "data:application/zip;base64," + base64
		// window.location = data_url
		var link = $("#zip_a")
		link.attr("href", data_url)
		link.attr("download", "libraries_bundle.zip")
		link.attr("title", "libraries_bundle.zip")
		$("#zip_link").html(link)
		$("#zip_link").show()
		$("#zip_in_progress").hide()
		$("#zip_popup .close").show()
	}).finally(() => {
		zipping = false
	})
}

$(document).on("click", "#zip_popup .close", (event) => {
	$("#zip_popup").hide()
})
$(document).on("click", "#zip_popup", (event) => {
	event.stopPropagation()
	var that = event.target
	if(that == $("#zip_popup")[0] && !zipping) {
		$("#zip_popup").hide()
	}
})

/***************************************************************
*** NOTE Manage the dropped files
*/

function update_the_selected_files() {
	var annoying_promises = []
	dropped_files_list.forEach((file) => {
		if(file.name.match(/\.py$/)) {
			annoying_promises.push(file.text())
		}
	})
	Promise.all(annoying_promises).then((values) => {
		values.forEach((full_content) => {
			var imports = library_bundle.get_imports_from_python(full_content)
			imports.forEach((item) => {
				if(!dropped_modules_list.includes(item)) {
					dropped_modules_list.push(item)
				}
			})
		})

		var name_list = ""
		for(var idx in dropped_files_list) {
			var file = dropped_files_list[idx]
			var temp_list = name_list + " " + file.name
			if(temp_list.length > MAX_FILE_NAMES) {
				name_list += " ..."
				break
			}
			name_list = temp_list
		}
		$("#dropped_files_list").html(name_list)

		update_dependencies_list()

		$("#drop_loading").hide()
		if(dropped_files_list.length > 0) {
			$("#drop_controls").show()
			$("#drop_message").hide()
			$("#dropped_files_list").show()
		} else {
			$("#drop_controls").hide()
			$("#drop_message").show()
			$("#dropped_files_list").hide()
		}

	})
	// nothing here, because reading a file can not be synchronous somehow ?
}

$(document).on("change", "#select_files_input", (event) => {
	var that = event.target
	for(var idx=0; idx < that.files.length; ++idx) {
		var file = that.files[idx]
		dropped_files_list.push(file)
	}
	update_the_selected_files()
})
$(document).on("drop", "#drop_zone", (event) => {
	event.stopPropagation()
	event.preventDefault()

	$("#drop_zone").removeClass("being_hovered")
	$("#drop_loading").show()
	$("#drop_controls").hide()
	$("#drop_message").hide()

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
			dropped_files_list.push(data_transfer.files[i])
		}
	}
	update_the_selected_files()
})
$(document).on("dragenter", "#drop_zone", (event) => {
	$("#drop_zone").addClass("being_hovered")
	event.stopPropagation()
	event.preventDefault()
})
$(document).on("dragexit", "#drop_zone", (event) => {
	$("#drop_zone").removeClass("being_hovered")
	event.stopPropagation()
	event.preventDefault()
})
$(document).on("dragover", "#drop_zone", (event) => {
	event.stopPropagation()
	event.preventDefault()
})
$(document).on("click", "#select_files_input", (event) => {
	event.stopPropagation()
})
$(document).on("click", ".load_some_files", (event) => {
	event.stopPropagation()
	if(zipping) return
	$("#select_files_input").click()
})
$(document).on("click", "#erase_drop", (event) => {
	event.stopPropagation()
	if(zipping) return
	dropped_modules_list = []
	dropped_files_list = []
	update_dependencies_list()
	$("#drop_controls").hide()
	$("#drop_message").show()
	$("#dropped_files_list").hide().html("")
})
$(document).on("click", "#zip_button", zipit)

/***************************************************************
*** NOTE Init the content of the modules list
*/

async function start() {
	$("#modules .loading_image").show()
	library_bundle.setup_the_modules_list().then(() => {
		var keys = Object.keys(library_bundle.all_the_modules)
		$("#modules .loading_image").hide()
		keys.sort()
		keys.forEach((module_name, pair) => {
			var nd1 = library_bundle.all_the_modules[module_name].dependencies.length
			var nd2 = library_bundle.all_the_modules[module_name].external_dependencies.length
			var num_deps = ""
			if(DEBUG) { num_deps = `(${nd1+nd2})`; }
			$("#modules").append(
				`<p class="pair${pair%2}">
					<input class="checkbox" type="checkbox"/>
					<span class="module">${module_name}</span> ${num_deps}
				</p>`
			)
		})
		filter_the_modules()
	})
}

start()
