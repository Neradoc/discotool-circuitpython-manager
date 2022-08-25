/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
/* Circup class
 * Implement the procedures to list, analyze and update libraries.
*/

function semver(str) {
	return str.split("-")[0].split(/\./).map((x) => parseInt(x));
}

function semver_compare(a,b) {
	return (
		(parseInt(a.split(".")[0]) - parseInt(b.split(".")[0]))
		|| (parseInt(a.split(".")[1]) - parseInt(b.split(".")[1]))
		|| (parseInt(a.split(".")[2]) - parseInt(b.split(".")[2]))
	);
}

class Circup {
	static BAD_MPY = -1;

	constructor(library_bundle, workflow) {
		this.library_bundle = library_bundle
		this.workflow = workflow
	}

	async start() {
		//  console.log(this.library_bundle)
	}

	async install_modules(dependencies) {
		for(var module_name of dependencies) {
			console.log("Installing", module_name);
			var module = this.library_bundle.get_module(module_name);
			var module_files = await this.library_bundle.list_module_files(module);
			if(module.package) {
				await this.workflow.create_dir(`/lib/${module.name}/`);
			}
			for(var file of module_files) {
				var upload_path = file.name.replace(/^[^\/]+\//, "/");
				// var upload_path = file.name.replace(/^.+?\/lib\//, "/lib/");
				await this.workflow.upload_file(upload_path, file);
			}
		}
	}

	async get_module_version(module_name, board_libs=null) {
		if(board_libs === null) {
			board_libs = await this.library_bundle.get_lib_directory()
		}
		var module = this.library_bundle.get_module(module_name);
		var module_path = `/lib/${module.name}`
		var pkg = module.package;
		var module_files = [];
		var cpver = await this.workflow.cp_version();

		if(pkg && board_libs.includes(module.name)) {
			// look at all files in the package
			var response = await this.workflow.list_dir(module_path + "/");
			module_files = response.content;
			module_files = module_files.map((item) => module_path + "/" + item.name);
		} else if(!pkg && board_libs.includes(module.name + ".py")) {
			module_files = [module_path+".py"];
		} else if(!pkg && board_libs.includes(module.name + ".mpy")) {
			module_files = [module_path+".mpy"];
		} else {
			return null;
		}

		var version = false;
		for(var file_name of module_files) {
			var response = await this.workflow.get_file_content("/" + file_name);
			if(!response.ok) { continue }
			var file_data = response.content;
			// empty MPY files are bad
			if(file_data.length == 0 && file_name.endsWith(".mpy")) {
				version = null;
				break;
			}
			if(file_data.length > 0) {
				if(file_name.endsWith(".mpy")) {
					// bad version of mpy files
					if(file_data[0] != "C" || file_data[1] != "\x05") {
						version = this.BAD_MPY;
						break;
					}
					// find version in mpy file
					var matches = file_data.match(/(\d+\.\d+\.\d+).+?__version__/);
					if(matches && matches.length > 1) {
						version = matches[1];
					}
				}
				// find version in py file
				if(file_name.endsWith(".py")) {
					var matches = file_data.match(/__version__.+?(\d+\.\d+\.\d+)/);
					if(matches && matches.length > 1) {
						version = matches[1];
					}
				}
			}
		}
		return version;
	}
}

export { Circup }
