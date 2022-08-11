// WIP

class Workflow {

	constructor() {
	}
	async start() {
	}
	async device_info() {
		return {
			"version": null
		};
	}
	async cp_version() {
		var version_data = await this.device_info();
		return version_data.version;
	}
	async is_editable() {
		return false;
	}
	set_credentials(user, password) {
		this.user = user;
		this.password = password;
	}
	async get_file_content(filepath, range=null) {
		// return `print("Hello world")`;
		return null;
	}
	async list_dir(dirpath) {
		// return ["/code.py", "/boot_out.txt", "/lib/"];
		return [];
	}
	async upload_file(upload_path, file) {
		console.log("Error: Cannot write to the drive");
		return false;
	}
	async create_dir(dir_path) {
		console.log("Error: Cannot write to the drive");
		return false;
	}
}

export { Workflow };
