// WIP

var version_example = {
	"version": "8.0.0-alpha.1-131-gf9b9f5568",
	"build_date": "2022-08-11",
	"board_name": "Adafruit FunHouse",
	"mcu_name": "ESP32S2",
	"board_id": "adafruit_funhouse",
	"creator_id": 9114,
	"creation_id": 33018,
	// web only
	"hostname": "cpy-1737d6",
	"port": 80,
	"ip": "192.168.1.47",
	"web_api_version": 1,
}

class WorkflowResponse {
	constructor(ok, content, status=200, statusText="OK") {
		this.ok = ok;
		this.status = status;
		this.statusText = statusText;
		this.content = content;
		// have text and json ?
		// rename json to array/dict ?
	}
}

class WorkflowFile {
	constructor(name, directory, size, time, creation_time=0) {
		this.name = name;
		this.directory = directory;
		this.size = size;
		this.modification = time;
		this.creation = creation_time || time;
	}
}

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
		return new WorkflowResponse(false, null);;
	}
	async list_dir(dirpath) {
		// return ["/code.py", "/boot_out.txt", "/lib/"];
		return new WorkflowResponse(false, []);
	}
	async upload_file(upload_path, file) {
		console.log("Error: Cannot write to the drive");
		return new WorkflowResponse(false, null, 409, "ERROR");
	}
	async create_dir(dir_path) {
		console.log("Error: Cannot write to the drive");
		return new WorkflowResponse(false, null, 409, "ERROR");
	}
	async delete_file(file_path) {
		console.log("Error: Cannot write to the drive");
		return new WorkflowResponse(false, null, 409, "ERROR");
	}
}

export { Workflow, WorkflowResponse, WorkflowFile };
