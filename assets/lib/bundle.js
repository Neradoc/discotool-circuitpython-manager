/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

const AccessMode = {
	NONE: 0,
	GITHUB: 1,
	PROXY: 2,
	LINK: 3,
}

class LibraryBundle {
	constructor(bundle_access=null, cpver=9) {
		if(bundle_access == null) {
			this.BUNDLE_ACCESS = AccessMode.GITHUB
			this.BUNDLE_URL = "https://github.com/"
		} else if(typeof(bundle_access) == "string") {
			if(bundle_access.match(/^proxy:/)) {
				this.BUNDLE_ACCESS = AccessMode.PROXY
				this.BUNDLE_URL = bundle_access.substr(6)
			} else if(bundle_access.match(/^https?:\/\//)) {
				this.BUNDLE_ACCESS = AccessMode.LINK
				this.BUNDLE_URL = bundle_access
			} else {
				this.BUNDLE_ACCESS = AccessMode.LINK
				this.BUNDLE_URL = "."
			}
		} else {
			this.BUNDLE_ACCESS = AccessMode.PROXY
			this.BUNDLE_URL = "proxy.php"
		}
		// Github configuration
		this.base_github = "https://github.com/"
		this.bundles_config = [
			"adafruit/Adafruit_CircuitPython_Bundle",
			"adafruit/CircuitPython_Community_Bundle",
			"circuitpython/CircuitPython_Org_Bundle",
			"Neradoc/Circuitpython_Keyboard_Layouts",
		]
		// circuitpython version here for URLs (7.x)
		this.cp_version_url = `${cpver}.x`
		// full modules list from the github bundles
		this.all_the_modules = null
		// the circuitpython bundles from github
		this.bundle_zips = new Map()

		// bundle tags cache
		this.bundles_tags = new Map()
		this.bundles_config.forEach((repo) => {
			this.bundles_tags.set(repo, false)
		})
	}

	/***************************************************************
	*** NOTE Zip reading stuff
	*/


	async get_bundle_tag_github(repo) {
		if( this.bundles_tags.get(repo) != false ) {
			return this.bundles_tags.get(repo)
		}
		const url_latest = `${this.base_github}/${repo}/releases/latest`
		var response = await fetch(url_latest)
		var bundle_tag = response.url.split("/").pop()
		this.bundles_tags.set(repo,bundle_tag)
		return bundle_tag
	}

	/***************************************************************
	*** NOTE Get urls for the files (local proxy to avoid CORS)
	*/


	async get_bundle_json_url(repo) {
		var user = repo.split("/")[0]
		var repo_name = repo.split("/")[1]
		switch(this.BUNDLE_ACCESS) {
		case AccessMode.PROXY:
			return `${this.BUNDLE_URL}?action=json&user=${user}&repo=${repo_name}`
		case AccessMode.GITHUB:
			var bundle_tag = await this.get_bundle_tag_github(repo)
			var base_name = repo_name.toLowerCase().replaceAll("_","-")
			var json_name = `${base_name}-${bundle_tag}.json`
			var json_url = `${this.base_github}/${repo}/releases/download/${bundle_tag}/${json_name}`
			return json_url
		case AccessMode.LINK:
			var json_url = `${this.BUNDLE_URL}/${repo_name}-latest.json`
			return json_url
		}
		// todo: raise
		return null
	}

	async get_bundle_zip_url(repo) {
		var user = repo.split("/")[0]
		var repo_name = repo.split("/")[1]
		switch(this.BUNDLE_ACCESS) {
		case AccessMode.PROXY:
			var proxy_url = `${this.BUNDLE_URL}?action=zip&user=${user}` + `&repo=${repo_name}&cpver=${this.cp_version_url}`
			return proxy_url
		case AccessMode.GITHUB:
			var bundle_tag = await this.get_bundle_tag_github(repo)
			var base_name = repo_name.toLowerCase().replaceAll("_","-")
			var zip_name = `${base_name}-${this.cp_version_url}-mpy-${bundle_tag}.zip`
			return `${this.base_github}/${repo}/releases/download/${bundle_tag}/${zip_name}`
		case AccessMode.LINK:
			var zip_url = `${this.BUNDLE_URL}/${repo_name}-${this.cp_version_url}-mpy-latest.zip`
			return zip_url
		}
		// todo: raise
		return null
	}

	// Fetch the zip file for a bundle based on a module.
	// Each zip file is only fetched once, cached in the bundle_zips instance.
	async get_bundle_module_contents(module) {
		var zip_url = await this.get_bundle_zip_url(module.bundle)

		if(!this.bundle_zips.has(zip_url)) {
			var response = await fetch(zip_url)
			var data = await response.blob()
			var zip_contents = new JSZip()
			await zip_contents.loadAsync(data)
			this.bundle_zips.set(zip_url, zip_contents)
		}
		var zip_contents = this.bundle_zips.get(zip_url)
		return zip_contents
	}

	// List all the files in a module from a bundle.
	async list_module_files(module) {
		var files_list = []
		var zip_contents = await this.get_bundle_module_contents(module)
		var bundle_path = Object.keys(zip_contents.files)[0].split("/")[0]+"/lib"
		if(module.package) {
			var zip_folder = await zip_contents.folder(`${bundle_path}/${module.name}/`)
			if(zip_folder == null) {
				console.log("NULL ??? zip_folder is NULL !")
			}
			await zip_folder.forEach((relativePath, file) => {
				files_list.push(file)
			})
			for(var idx in files_list) {
				var file = files_list[idx]
				var zip_file = await zip_contents.file(file.name)
				if (zip_file !== null) {
					var zip_data = await zip_file.async("uint8array")
				} else {
					console.log("NULL ???", file.name)
				}
			}
		} else {
			var in_file_name = `${bundle_path}/${module.name}.mpy`
			var zip_file = await zip_contents.file(in_file_name)
			if(zip_file !== null) {
				files_list.push(zip_file)
				var zip_data = await zip_file.async("uint8array")
			} else {
				console.log("NULL ???", in_file_name)
			}
		}
		return files_list
	}

	/***************************************************************
	*** NOTE Manage dependencies
	*/

	// Find a module in the modules list from its name or pypi name.
	get_module(module_name) {
		if(this.all_the_modules[module_name] != undefined) {
			return this.all_the_modules[module_name]
		}
		for(var mname in this.all_the_modules) {
			var module = this.all_the_modules[mname]
			if(module.pypi_name == module_name) {
				return module
			}
		}
		return false
	}

	// Gets the dependencies of modules, adds them to dependencies.
	get_dependencies(modules, dependencies) {
		for(var module of modules) {
			// remove dots if fed composite paths with submodules
			module = module.replace(/\.\S*$/, "")
			if(module && this.get_module(module) !== false) {
				if(!dependencies.includes(module)) {
					dependencies.push(module)
				}
				const module_info = this.get_module(module)
				var deps = module_info.dependencies.concat(
					module_info.external_dependencies
				)
				for(var depmodule of deps) {
					const dep_info = this.get_module(depmodule)
					if(dep_info === false) { continue; }
					const dep_ref_name = dep_info.name
					if(dependencies.includes(dep_ref_name)) { continue; }
					dependencies.push(dep_ref_name)
					this.get_dependencies([dep_ref_name], dependencies)
				}
			}
		}
	}

	// From a python file's full text, get the list of modules imported.
	// Does not know anything about multiline strings.
	// This only gets the basic root modules, no submodules or relative.
	// Use to find library bundle imports.
	get_imports_from_python(full_content) {
		var modules_list = []
		const pattern = /^\s*(import|from)\s+([^.\s]+).*/
		full_content.split(/\n|\r/).forEach((line) => {
			/*
			import module
			import module as ...
			import module.sub ...
			from module import ...
			from module.sub import ... as ...
			*/
			var m = line.match(pattern)
			if(m) {
				var module = m[2]
				if(this.get_module(module) !== false && !modules_list.includes(module)) {
					modules_list.push(module)
				}
			}
		})
		return modules_list
	}

	// From a python file's full text, get the list of modules imported.
	// Does not know anything about multiline strings.
	// Tries to include everything with dots and stuff.
	get_imports_from_python_all(full_content) {
		var modules_list = []
		const patterns = [
			// import module, module as name, module
			/^\s*(import)\s+([^#]+).*/,
			/^\s*from\s+(\S+)\s+import\s+([^#]+).*/,
		]
		full_content.split(/\n|\r/).forEach((line) => {
			/*
			import module0, module1
			import module2 as thing2
			import module3.sub3
			from module4 import thing4
			from module5.sub2 import thing5 as thing6
			from .module6 import thing7
			from ..module7 import thing8
			from . import module8, module9
			from .. import module10
			*/
			for(var patt of patterns) {
				var m = line.match(patt)
				if(m) {
					var from = m[1]
					const modules = m[2].split(",")
					for(var module of modules) {
						// remove everything after the space ("as ...")
						var module = module.replace(/^([^\s]+)\s+.*/, "$1").trim()
						// reltive imports use from (simply append "." or "..")
						if(from == "." || from == "..") {
							module = from + module
						} else if(from != "import") {
							module = from + "." + module
						}
						const subs = module.split(".")
						for(var sub=1; sub<=subs.length; ++sub) {
							const module = subs.slice(0, sub).join(".")
							if(module == "") { continue }
							if(module == ".") { continue }
							if(module == "..") { continue }
							if(!modules_list.includes(module)) {
								modules_list.push(module)
							}
						}
					}
				}
			}
		})
		return modules_list
	}

	// Setup the list of modules from each bundle.
	async setup_the_modules_list() {
		if(this.all_the_modules !== null) {
			return
		}
		this.all_the_modules = {}
		var bundle_promises = []
		this.bundles_config.forEach((repo, index) => {
			var prom = this.get_bundle_json_url(repo).then(async (json_url) => {
				var response = await fetch(json_url)
				var modules = await response.json()
				for(var key in modules) {
					modules[key]["bundle"] = repo
					modules[key]["name"] = key
				}
				return modules
			})
			bundle_promises.push(prom)
		})
		return Promise.all(bundle_promises).then((values) => {
			values.forEach((item) => {
				this.all_the_modules = Object.assign({}, this.all_the_modules, item)
			})
		})
	}
}

export { LibraryBundle }
