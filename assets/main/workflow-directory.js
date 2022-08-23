/*
SPDX-FileCopyrightText: Copyright (c) Scott Shawcroft for Adafruit
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
import * as common from "./common.js";

const HIDDEN = [
	".fseventsd",
	".metadata_never_index",
	".Trashes",
	".TemporaryItems",
	"System Volume Information",
];
const SECRETS = [".env", "secrets.py"];

let new_directory_name = document.getElementById("name");
let files = document.getElementById("files_upload");
var current_path = common.current_path;
var refreshing = false;

const HIDE = {
	NOTHING: 0,
	DEFAULT_SYSTEM_FILES: 1,
	ALL_SYSTEM_FILES: 2,
	ALL_DOTTED_FILES: 3,
};

var hide_level = HIDE.DEFAULT_SYSTEM_FILES;

async function refresh_list() {
	if (refreshing) {
		return;
	}
	refreshing = true;
	try {
		var top = Math.floor($('#file_list_list').height() / 2 - $('#file_list_loading_image').height() / 2);
		$('#file_list_loading_image').css("top", `${top}px`);
		$('#file_list_loading_image').show();
		$('#file_list_error_image').hide();
		$('#file_list_list').css("opacity", "0.30");

		if (current_path == "") {
			current_path = "/";
		}

		var drive_name = common.board_control.drive_name || "CIRCUITPY"
		var pwd = $('#pwd .dir_path');
		var pwd_link = `<a class="files_list_dir dir" href="?path=/#files" data-path="/">${drive_name}</a>/`
		var fullpath = "/";
		for(var path of current_path.split("/")) {
			if(path != "") {
				fullpath += path + "/";
				pwd_link += `<a href="?path=${fullpath}#files" data-path="${fullpath}" class="dir files_list_dir">${path}</a>/`;
			}
		}
		pwd.html(pwd_link);

		if(!await common.board_control.is_editable()) {
			$("#pwd .icon_locked").show()
		}

		/*
		var heads = common.headers({"Accept": "application/json"});
		const response = await fetch(new URL("/fs" + current_path, common.workflow_url_base),
			{
				headers: heads,
				credentials: "include"
			}
		);
		if (! response.ok) {
			$('#file_list_error_image').show();
			$('#file_list_body tr').remove();
		
			const message = `Dir list failed`;
			const status = await response.status;
			const error = await response.statusText;
			switch(status) {
			case 401:
				console.log(`${message}: Bad password !`);
				break;
			case 403:
				console.log(`${message}: Not authorized !`);
				break;
			case 409:
				console.log(`${message}: Drive read-only !`);
				break;
			default:
				console.log(`${message}: ${error} !`);
			}
			return;
		}
		const data = await response.json();
		*/
		var response = await common.board_control.list_dir(current_path);
		var dir_files_list = response.content;
		var new_children = [];
		var template = $('#file_list_template');

		if (current_path != "/") {
			var clone = template.clone();
			var td = clone.find("td");
			td[0].innerHTML = "⬆️";
			var path_link = clone.find("a")[0];
			let parent = new URL("..", "file://" + current_path);
			var file_path = parent.pathname;
			path_link.href = common.url_here({"path": parent.pathname});
			path_link.classList.add("files_list_dir");
			path_link.setAttribute("data-path", file_path);
			path_link.innerHTML = "..";
			// Remove the delete button
			td[4].replaceChildren();
			new_children.push(clone);
		}

		dir_files_list.sort((a,b) => {
			return a.name.localeCompare(b.name);
		})

		for (const file_info of dir_files_list) {
			// Clone the new row and insert it into the table
			var clone = template.clone();
			var td = clone.find("td");
			var file_path = current_path + file_info.name;
			// TODO: this is backend-specific
			// -> make the backend cooperate with this to get the "direct reference"
			// for web workflow it is currently the direct URL, though it should
			// not remain so in the future.
			let api_url = common.board_control.api_url(file_path)
			if (file_info.directory) {
				file_path += "/";
				api_url += "/";
			}
			const ext_icons = [
				[["txt", "py", "js", "json"], "📄"],
				[["html", "html"], "🌐"],
				[["mpy"], "🐍"],
				[["jpg", "jpeg", "png", "bmp", "gif"], "🖼"],
				[["wav", "mp3", "ogg"], "🎵"],
			]
			var icon = "❓";
			if (current_path == "/" && SECRETS.includes(file_info.name)) {
				icon = "🔑"; // 🔐
			} else if (current_path == "/" && HIDDEN.includes(file_info.name)) {
				// hidden names in root
				if(hide_level >= HIDE.DEFAULT_SYSTEM_FILES) continue
			} else if (file_info.name.startsWith("._")) {
				icon = "🍎";
				if(hide_level >= HIDE.ALL_SYSTEM_FILES) continue
			} else if (file_info.name.startsWith(".")) {
				icon = "🚫";
				if(hide_level >= HIDE.ALL_DOTTED_FILES) continue
			} else if (current_path == "/" && file_info.name == "lib") {
				icon = "📚";
			} else if (file_info.directory) {
				icon = "📁";
			} else {
				for(const file_dat of ext_icons) {
					const ext = file_info.name.split(".").pop()
					if(file_dat[0].includes(ext)) {
						icon = file_dat[1]
						break
					}
				}
			}
			td[0].innerHTML = icon;
			td[1].innerHTML = file_info.file_size;

			var path = clone.find("a.path");
			path.html(file_info.name);
			if(file_info.directory) {
				path.attr("href", common.url_here({"path": `${file_path}`}));
				path.addClass("files_list_dir");
				path.data("path", file_path);
			} else {
				path.attr("href", api_url);
			}
			td[3].innerHTML = (new Date(file_info.modified)).toLocaleString();
			var delete_button = clone.find(".delete");
			delete_button.data("path", file_path);
			delete_button.val(file_path);
			delete_button.on("click", del);

			var edit_button = clone.find(".edit");
			if(file_info.directory) {
				edit_button.remove()
			} else {
				// TODO: this is backend-specific
				// we want an edit page that is backend agnostic.
				var edit_url = common.board_control.edit_url(file_path)
				edit_url.hash = `#${file_path}`;
				edit_button.attr("href", edit_url);
			}

			var analyze_button = clone.find(".analyze");
			if(file_info.name.endsWith(".py")) {  // || search("requirement") >= 0 ?
				analyze_button.data("path", file_path);
				analyze_button.val(api_url);
			} else {
				analyze_button.remove()
			}

			new_children.push(clone);
		}
		$('#file_list_loading_image').hide();
		$("#file_list_body tr").remove();
		$("#file_list_body").append(new_children);
		$('#file_list_loading_image').hide();
	} catch(e) {
		console.log("Directory")
		console.log(e)
	} finally {
		refreshing = false;
		$('#file_list_loading_image').hide();
		$('#file_list_list').css("opacity", "1");
		if(!await common.board_control.is_editable()) {
			$("#file_list").addClass("locked");
		}
	}
}

async function mkdir(e) {
	var dir_path = current_path + new_directory_name.value + "/";
	var response = await common.board_control.create_dir(dir_path);
	if (response.ok) {
		refresh_list();
		new_directory_name.value = "";
		mkdir_button.disabled = true;
	}
}

async function upload(e) {
	console.log("upload");
	for (const file of files.files) {
		console.log(file_path, file);
		var response = await common.board_control.upload_file(current_path + file.name, file);
		if (response.ok) {
			refresh_list();
			console.log(files);
			files.value = "";
			upload_button.disabled = true;
		}
	}
}

async function del(e) {
	var path = $(e.target).data("path");
	console.log("delete", path);
	var prompt = `Delete ${path}`;
	if (path.endsWith("/")) {
		prompt += " and all of its contents?";
	} else {
		prompt += "?";
	}
	if (confirm(prompt)) {
		console.log(path);
		var response = await common.board_control.delete_file(path);
		if (response.ok) {
			refresh_list();
		} else {
			const message = `Deleting ${fn.pathname.substr(3)} failed`;
			const status = await response.status;
			const error = await response.statusText;
			switch(status) {
			case 401:
				console.log(`${message}: Bad password !`);
				break;
			case 403:
				console.log(`${message}: Not authorized !`);
				break;
			case 409:
				console.log(`${message}: Drive read-only !`);
				break;
			default:
				console.log(`${message}: ${error} !`);
			}
		}
	}
	return false;
}

async function load_directory(path) {
	current_path = path;
	window.history.pushState({}, '', common.url_here({'path': path}));
	refresh_list();
}

async function setup_directory() {
	let mkdir_button = document.getElementById("mkdir");
	mkdir_button.onclick = mkdir;

	let upload_button = document.getElementById("upload");
	upload_button.onclick = upload;

	upload_button.disabled = files.files.length == 0;

	files.onchange = () => {
		upload_button.disabled = files.files.length == 0;
	}

	mkdir_button.disabled = new_directory_name.value.length == 0;

	new_directory_name.oninput = () => {
		mkdir_button.disabled = new_directory_name.value.length == 0;
	}

	$(document).on("click", "a.files_list_dir", (e) => {
		var self = $(e.target);
		load_directory(self.data("path"));
		return false;
	});
	$(document).on("click", ".refresh_list", (e) => {
		refresh_list();
	});
	$(document).on("change", "#password", (e) => {
		refresh_list();
	});
}

export { setup_directory, refresh_list };
