/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
/* Circup class
 * Implement the procedures to list, analyze and update libraries.
*/

const MPY_HEADERS = {
	7: ["C".codePointAt(0), 5],
	8: ["C".codePointAt(0), 5],
	9: ["C".codePointAt(0), 6],
}

function semver(str) {
	return str.split("-")[0].split(/\./).map((x) => parseInt(x))
}

function semver_compare(a,b) {
	return (
		(parseInt(a.split(".")[0]) - parseInt(b.split(".")[0]))
		|| (parseInt(a.split(".")[1]) - parseInt(b.split(".")[1]))
		|| (parseInt(a.split(".")[2]) - parseInt(b.split(".")[2]))
	)
}

function ignore_file(file_name) {
	return file_name.match(/(^\.|\/\.)/) ? true : false
}

class Circup {
	static BAD_MPY = -1
	BAD_MPY = Circup.BAD_MPY

	constructor(library_bundle, workflow, cpver) {
		this.library_bundle = library_bundle
		this.workflow = workflow
		this.MPY_HEADER = null
		if(MPY_HEADERS[cpver] != undefined) {
			this.MPY_HEADER = MPY_HEADERS[cpver]
		}
	}

	async start() {
		//  console.log(this.library_bundle)
	}

	async install_modules(dependencies) {
		for(var module_name of dependencies) {
			console.log("Installing", module_name)
			var module = this.library_bundle.get_module(module_name)
			var module_files = await this.library_bundle.list_module_files(module)
			var module_base = `/lib/${module.name}/`
			if(module.package) {
				await this.workflow.create_dir(module_base)
			}
			for(var file of module_files) {
				const upload_path = file.name.replace(/^[^\/]+\//, "/")
				// list and create the intermediary sub-directories if needed
				const parts = upload_path.split("/").filter((x) => x.length)
				const subdirs = parts.slice(2,-1)
				var dir_path = module_base
				for(const sub of subdirs) {
					dir_path = `${dir_path}${sub}/`
					await this.workflow.create_dir(dir_path)
				}
				// var upload_path = file.name.replace(/^.+?\/lib\//, "/lib/")
				const file_content = await file.async("blob")
				await this.workflow.upload_file(upload_path, file_content)
			}
		}
	}

	async sublist(cur_dir, module_files) {
		const response = await this.workflow.list_dir(cur_dir + "/")
		const these_files = response.content
		for(var ffile of these_files) {
			const full_path = `${cur_dir}/${ffile.name}`
			if(ffile.directory) {
				await this.sublist(full_path, module_files)
			} else {
				if(ffile.name.endsWith(".py") || ffile.name.endsWith(".mpy")) {
					module_files.push(full_path)
				}
			}
		}
		module_files = module_files.map((item) => cur_dir + "/" + item.name)
	}

	async get_module_version(module_name, board_libs=null) {
		if(board_libs === null) {
			board_libs = await this.library_bundle.get_lib_directory()
		}
		var module = this.library_bundle.get_module(module_name)
		var module_path = `/lib/${module.name}`
		var pkg = module.package
		var module_files = []
		var cpver = await this.workflow.cp_version()

		if(pkg && board_libs.includes(module.name)) {
			// look at all files in the package recursively
			await this.sublist(module_path, module_files)
		} else if(!pkg && board_libs.includes(module.name + ".py")) {
			module_files = [module_path+".py"]
		} else if(!pkg && board_libs.includes(module.name + ".mpy")) {
			module_files = [module_path+".mpy"]
		} else {
			return null
		}

		var version = false
		for(var file_name of module_files) {
			if(ignore_file(file_name)) { continue }
			var file_path = ("/" + file_name).replace(/\/\/+/, "/")
			var response = await this.workflow.get_file_content(file_path)
			if(!response.ok) { continue }
			var file_data = response.content
			var file_text = response.textContent()
			// empty MPY files are bad
			if(file_data.length == 0 && file_name.endsWith(".mpy")) {
				version = null
				break
			}
			if(file_data.length > 0) {
				if(file_name.endsWith(".mpy")) {
					// bad version of mpy files
					if(this.MPY_HEADER != null) {
						if(file_data[0] != this.MPY_HEADER[0] || file_data[1] != this.MPY_HEADER[1]) {
							version = this.BAD_MPY
							break
						}
					}
					if(this.MPY_HEADER[1] < 6) {
						// find version in mpy file with name
						var matches = file_text.match(/(\d+\.\d+\.\d+).+?__version__/)
					} else {
						// find first thing that matches a version number at all
						var matches = file_text.match(/(\d+\.\d+\.\d+)\x00/)
					}
					if(matches && matches.length > 1) {
						version = matches[1]
					}
				}
				// find version in py file
				if(file_name.endsWith(".py")) {
					var matches = file_text.match(/__version__.+?(\d+\.\d+\.\d+)/)
					if(matches && matches.length > 1) {
						version = matches[1]
					}
				}
			}
		}
		return version
	}
}

export { Circup }
