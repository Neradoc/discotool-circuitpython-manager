let base_github = "https://github.com/";
var bundles_config = [
	"adafruit/Adafruit_CircuitPython_Bundle",
	"adafruit/CircuitPython_Community_Bundle",
	"circuitpython/CircuitPython_Org_Bundle",
];
// full modules list from the github bundles
var all_the_modules = {};
// list of files added to the drop zone
var dropped_files_list = [];
// list of modules found in the files
var dropped_modules_list = [];
// the circuitpython bundles from github
var bundle_zips = new Map();
// the zip code is running, the button won't respond
var zipping = false;

// limit to the list of files names before cut to "..."
let MAX_FILE_NAMES = 80;
// the prefix is added to file paths inside the zip (add "/" for a folder)
let ZIP_PREFIX = "CIRCUITPY/";
// README.txt file added to the zip
let README = `Circuitpython Libraries Bundle

Copy the files and directories in this bundle from the "lib" directory
into the target board's "lib" directory inside the CIRCUITPY drive.

More information on Circuitpython librairies:
https://circuitpython.org/libraries
`;

/***************************************************************
*** NOTE Colorize list of modules
*/

function color_the_lists() {
	function color_list(i,that) {
		$(that).removeClass("pair0");
		$(that).removeClass("pair1");
		$(that).addClass(`pair${i%2}`);
	}
	$("#modules p:visible").each(color_list);
	$("#dependencies p:visible").each(color_list);
}

/***************************************************************
*** NOTE Manage the dependencies list
*/

function get_dependencies(module, all_deps) {
	if(!all_deps.includes(module)) {
		all_deps.push(module);
	}
	var deps = all_the_modules[module].dependencies;
	for(index in deps) {
		depmodule = deps[index];
		if(all_deps.includes(depmodule)) { continue; }
		all_deps.push(depmodule);
		get_dependencies(depmodule, all_deps);
	}
}
function update_dependencies_list() {
	var modules_list = [];
	$("#modules .selected .module").each((i,that) => {
		var module = $(that).html();
		get_dependencies(module, modules_list);
	});
	dropped_modules_list.forEach((module) => {
		get_dependencies(module, modules_list);
	});
	modules_list.sort();
	$("#dependencies").html("");
	var pair = 0;
	for(index in modules_list) {
		pair = pair + 1;
		var module_name = modules_list[index];
		var module = all_the_modules[module_name];
		var ext = "";
		if(!module.package) {
			ext = ".mpy";
		}
		$("#dependencies").append(
			`<p class="pair${pair%2}"><span class="module">${module_name}</span>${ext}</p>`
		);
	}
	$(".num_deps").html(pair);

	$("#zip_button").show();
	$("#zip_link").hide();
}

/***************************************************************
*** NOTE Filter modules by name
*/

function filter_the_modules() {
	var that = $("#filter input");
	var search_string = that.val().trim();
	if(search_string == "") {
		$("#clear_search").removeClass("enabled");
		$("#modules p").show();
		color_the_lists();
		return;
	}
	$("#clear_search").addClass("enabled");
	var list_search = search_string.split(" ").filter(i => i);
	$("#modules p").each((i,item) => {
		var module_name = $(item).children(".module").html();
		var matches = false;
		list_search.forEach((sstring) => {
			if(module_name.match(sstring)) {
				matches = true;
			}
		});
		if(!matches) {
			$(item).hide();
		} else {
			$(item).show();
		}
	});
	color_the_lists();
}

$(document).on("keyup", "#filter input", (event) => {
	filter_the_modules();
});

$(document).on("click", "#clear_search", (event) => {
	$("#filter input").val("");
	filter_the_modules();
});

/***************************************************************
*** NOTE Manually select and deselect modules
*/

function toggle_deselect() {
	nselected = $(".selected").length;
	if(nselected > 0) {
		$("#deselect_all").addClass("enabled");
		$("#nselected").html(`(${nselected} selected)`);
	} else {
		$("#deselect_all").removeClass("enabled");
		$("#nselected").html("");
	}
	
}

$(document).on("click", "#modules p", (event) => {
	// "this" should work but doesn't, "target" can be the internal span or img
	var that = $(event.target).parents().addBack().filter("#modules p");
	var checkbox = that.find(".checkbox");
	that.toggleClass("selected");
	checkbox.prop("checked", that.hasClass("selected"))
	update_dependencies_list();
	toggle_deselect();
});

$(document).on("click", "#deselect_all", (event) => {
	$(".selected").removeClass("selected");
	$("#modules p .checkbox").prop("checked", false);
	update_dependencies_list();
	toggle_deselect();
});

/***************************************************************
*** NOTE Zip generating stuff
*/

function get_bundle_zip(repo, tag) {
	let base_name = repo.toLowerCase().replaceAll("_","-").replace(/^.*\//,"");
	let zip_name = `${base_name}-7.x-mpy-${tag}.zip`;
	let zip_url = `${base_github}/${repo}/releases/download/${tag}/${zip_name}`;
	return zip_url;
}

function get_bundle_base(repo, tag) {
	let base_name = repo.toLowerCase().replaceAll("_","-").replace(/^.*\//,"");
	return `${base_name}-7.x-mpy-${tag}`;
}

async function getBundleContents(zip_url) {
	var response = await fetch(zip_url);
	var data = response.blob();
	var bundleContents = new JSZip();
	await bundleContents.loadAsync(data);
	return bundleContents;
}

async function async_zipit() {
	var outputZip = new JSZip();

	// readme file
	await outputZip.file(ZIP_PREFIX + "README.txt", README);
	var modules_bom = $("#dependencies p .module");

	var total_zip_files = modules_bom.length + dropped_files_list.length;
	var zip_files_progress = 0;

	function count_one_file() {
		zip_files_progress += 1;
		// in case the math is weird:
		zip_files_progress = Math.min(zip_files_progress, total_zip_files);
		$("#zip_in_progress .file_progress").html(
			`${zip_files_progress}&nbsp;/`
			+ `&nbsp;${total_zip_files}`
		);
	}

	for(index = 0; index < modules_bom.length; ++index) {
		count_one_file();

		var item = modules_bom[index];
		var module_name = $(item).html();
		var module = all_the_modules[module_name];
		var zip_url = get_bundle_zip(module.bundle, module.bundle_tag);
		var bundle_base = get_bundle_base(module.bundle, module.bundle_tag);
		var bundle_path = `${bundle_base}/lib`;

		if(!bundle_zips.has(zip_url)) {
			var zipContents = await getBundleContents(zip_url);
			bundle_zips.set(zip_url, zipContents);
		}
		var zipContents = bundle_zips.get(zip_url);

		if(module.package) {
			var new_dir_name = `lib/${module_name}`;
			await outputZip.folder(ZIP_PREFIX + new_dir_name);
			// loop through the subfiles in zipContents and add them
			var zipFolder = await zipContents.folder(`${bundle_path}/${module_name}/`);
			if(zipFolder == null) {
				console.log("NULL ??? zipFolder is NULL !");
			}
			var subliste = [];
			await zipFolder.forEach((relativePath, file) => {
				subliste.push(file);
			});
			for(idx in subliste) {
				var file = subliste[idx];
				var out_file_name = file.name.replace(`${bundle_path}`, "lib");
				var zipFile = await zipContents.file(file.name);
				if (zipFile !== null) {
					var zipData = await zipFile.async("uint8array");
					await outputZip.file(ZIP_PREFIX + out_file_name, zipData);
				} else {
					console.log("NULL ???", file.name);
				}
			}
		} else {
			var in_file_name = `${bundle_path}/${module_name}.mpy`;
			var out_file_name = `lib/${module_name}.mpy`;
			var zipFile = await zipContents.file(in_file_name);
			if (zipFile !== null) {
				var zipData = await zipFile.async("uint8array");
				await outputZip.file(ZIP_PREFIX + out_file_name, zipData);
			} else {
				console.log("NULL ???", in_file_name);
			}
		}
	}
	for(idx in dropped_files_list) {
		count_one_file();
		var file = dropped_files_list[idx];
		await outputZip.file(ZIP_PREFIX + file.name, file);
	}
	return await outputZip.generateAsync({type:"base64"});
}

function zipit() {
	if(zipping) return false;
	if($("#dependencies p").length == 0) return false;
	zipping = true;
	$("#zip_button").hide();
	$("#zip_in_progress").show();
	$("#zipit .loading_image").show();
	// start the following as an async
	async_zipit().then(async (base64) => {
		// hide "in progress"
		data_url = "data:application/zip;base64," + base64;
		// window.location = data_url;
		var link = $('<a name="zip">Download the zip with all that</a>');
		link.attr("href", data_url);
		link.attr("download", "libraries_bundle.zip");
		link.attr("title", "libraries_bundle.zip");
		$("#zip_link").html(link);
		$("#zip_link").show();
		$("#zip_in_progress").hide();
	}).finally(() => {
		$("#zipit .loading_image").hide();
		zipping = false;
	});
}

/***************************************************************
*** NOTE Manage the dropped files
*/

function get_imports_from_python(full_content) {
	var modules_list = [];
	let pattern = /^\s*(import|from)\s+([^.\s]+).*/;
	full_content.split(/\n|\r/).forEach((line) => {
		/*
		import module
		import module as ...
		import module.sub ...
		from module import ...
		from module.sub import ... as ...
		*/
		m = line.match(pattern);
		if(m) {
			module = m[2];
			if(all_the_modules[module] != undefined && !modules_list.includes(module)) {
				modules_list.push(module);
			}
		}
	});
	return modules_list;
}
function update_the_selected_files() {
	var annoying_promises = [];
	dropped_files_list.forEach((file) => {
		if(file.name.match(/\.py$/)) {
			annoying_promises.push(file.text());
		}
	});
	Promise.all(annoying_promises).then((values) => {
		values.forEach((full_content) => {
			var imports = get_imports_from_python(full_content);
			imports.forEach((item) => {
				if(!dropped_modules_list.includes(item)) {
					dropped_modules_list.push(item);
				}
			});
		});

		var name_list = "";
		for(idx in dropped_files_list) {
			var file = dropped_files_list[idx];
			var temp_list = name_list + " " + file.name;
			if(temp_list.length > MAX_FILE_NAMES) {
				name_list += " ...";
				break;
			}
			name_list = temp_list;
		}
		$("#dropped_files_list").html(name_list);

		update_dependencies_list();

		$("#drop_loading").hide();
		if(dropped_files_list.length > 0) {
			$("#drop_controls").show();
			$("#drop_message").hide();
			$("#dropped_files_list").show();
		} else {
			$("#drop_controls").hide();
			$("#drop_message").show();
			$("#dropped_files_list").hide();
		}

	});
	// nothing here, because reading a file can not be synchronous somehow ?
}

$(document).on("change", "#select_files_input", (event) => {
	var that = event.target;
	for(idx=0; idx < that.files.length; ++idx) {
		var file = that.files[idx];
		dropped_files_list.push(file);
	}
	update_the_selected_files();
});
$(document).on("drop", "#drop_zone", (event) => {
	event.stopPropagation();
	event.preventDefault();

	$("#drop_zone").removeClass("being_hovered");
	$("#drop_loading").show();
	$("#drop_controls").hide();
	$("#drop_message").hide();

	var data_transfer = event.originalEvent.dataTransfer;
	if (data_transfer.items) {
		// Use DataTransferItemList interface to access the file(s)
		for (var i = 0; i < data_transfer.items.length; i++) {
			// If dropped items aren't files, reject them
			if (data_transfer.items[i].kind === 'file') {
				var file = data_transfer.items[i].getAsFile();
				dropped_files_list.push(file);
			}
		}
	} else {
		// Use DataTransfer interface to access the file(s)
		for (var i = 0; i < data_transfer.files.length; i++) {
			dropped_files_list.push(data_transfer.files[i]);
		}
	}
	update_the_selected_files();
});
$(document).on("dragenter", "#drop_zone", (event) => {
	$("#drop_zone").addClass("being_hovered");
	event.stopPropagation();
	event.preventDefault();
});
$(document).on("dragexit", "#drop_zone", (event) => {
	$("#drop_zone").removeClass("being_hovered");
	event.stopPropagation();
	event.preventDefault();
});
$(document).on("dragover", "#drop_zone", (event) => {
	event.stopPropagation();
	event.preventDefault();
});
$(document).on("click", "#select_files_input", (event) => {
	event.stopPropagation();
});
$(document).on("click", ".load_some_files", (event) => {
	event.stopPropagation();
	$("#select_files_input").click();
});
$(document).on("click", "#erase_drop", (event) => {
	event.stopPropagation();
	dropped_modules_list = [];
	dropped_files_list = [];
	update_dependencies_list();
	$("#drop_controls").hide();
	$("#drop_message").show();
	$("#dropped_files_list").hide().html("");
});

/***************************************************************
*** NOTE Init the content of the modules list
*/

function setup_the_modules_list() {
	$("#modules .loading_image").show();

	var bundle_promises = [];
	bundles_config.forEach((repo, index) => {
		let base_name = repo.split("/")[1].toLowerCase().replaceAll("_","-")
		var url_latest = `${base_github}/${repo}/releases/latest`;
		var xhr = new XMLHttpRequest();
		var bundle_tag = "";

		var prom = $.ajax({
			url: url_latest,
			type: 'get',
			xhr: function() {
				 return xhr;
			}
		}).then((data, textStatus, jqXHR) => {
			bundle_tag = xhr.responseURL.split("/").pop();
			let json_name = `${base_name}-${bundle_tag}.json`;
			let json_url = `${base_github}/${repo}/releases/download/${bundle_tag}/${json_name}`;
			return $.ajax({
				url: json_url,
				type: 'get',
			});
		}).then((data, textStatus, jqXHR) => {
			modules = JSON.parse(data);
			for(key in modules) {
				modules[key]["bundle"] = repo;
				modules[key]["bundle_tag"] = bundle_tag;
			}
			return modules;
		});
		bundle_promises.push(prom);
	});

	Promise.all(bundle_promises).then((values) => {
		values.forEach((item) => {
			all_the_modules = Object.assign({}, all_the_modules, item);
		});
		var keys = Object.keys(all_the_modules);
		$("#modules .loading_image").hide();
		keys.sort();
		keys.forEach((module_name, pair) => {
			$("#modules").append(
				`<p class="pair${pair%2}">
					<input class="checkbox" type="checkbox"/>
					<span class="module">${module_name}</span>
				</p>`
			);
		});
		filter_the_modules();
	});
}
setup_the_modules_list();
