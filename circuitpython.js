let new_directory_name = document.getElementById("name");
let files = document.getElementById("files");

var url_base = window.location;
var current_path;

async function refresh_list() {
    current_path = window.location.hash.substr(1);
    if (current_path == "") {
        current_path = "/";
    }
    const response = await fetch(new URL("/fs" + current_path, url_base),
        {
            headers: {
                "Accept": "application/json"
            },
            credentials: "include"
        }
    );
    const data = await response.json();
    var new_children = [];
    var template = document.querySelector('#row');

    if (window.location.path != "/fs/") {
        var clone = template.content.cloneNode(true);
        var td = clone.querySelectorAll("td");
        td[0].innerHTML = "&#128190;";
        var path = clone.querySelector("a");
        let parent = new URL("..", "file://" + current_path);
        path.href = "#" + parent.pathname;
        path.innerHTML = "..";
        // Remove the delete button
        td[4].replaceChildren();
        new_children.push(clone);
    }

	data.sort((a,b) => {
		return a.name.localeCompare(b.name);
	})
	
    for (const f of data) {
        // Clone the new row and insert it into the table
        var clone = template.content.cloneNode(true);
        var td = clone.querySelectorAll("td");
        var file_path = current_path + f.name;
        let api_url = new URL("/fs" + file_path, url_base);
        if (f.directory) {
            file_path = "#" + file_path + "/";
            api_url += "/";
        } else {
            file_path = api_url;
        }

        var icon = "&#11015;&#65039;";
        if (f.directory) {
            icon = "&#128193;";
        } else if(f.name.endsWith(".txt") ||
                  f.name.endsWith(".py") ||
                  f.name.endsWith(".js") ||
                  f.name.endsWith(".json")) {
            icon = "&#128196;";
        } else if (f.name.endsWith(".html")) {
            icon = "&#127760;";
        }
        td[0].innerHTML = icon;
        td[1].innerHTML = f.file_size;
        var path = clone.querySelector("a");
        path.href = file_path;
        path.innerHTML = f.name;
        td[3].innerHTML = (new Date(f.modified_ns / 1000000)).toLocaleString();
        var delete_button = clone.querySelector("button.delete");
        delete_button.value = api_url;
        delete_button.onclick = del;

        new_children.push(clone);
    }
    var tbody = document.querySelector("tbody");
    tbody.replaceChildren(...new_children);
}

async function find_devices() {
    const response = await fetch("http://circuitpython.local/cp/devices.json");
    let url = new URL("/", response.url);
    url_base = url.href;
    const data = await response.json();
    refresh_list();
}
// async function find_devices() {
//     const version_response = await fetch("/cp/version.json");
//     if (version_response.ok) {
//         url_base = new URL("/", window.location).href;
//     } else {
//         // TODO: Remove this when we've settled things. It is only used when this file isn't hosted
//         // by a CP device.
//         const response = await fetch("http://circuitpython.local/cp/devices.json");
//         let url = new URL("/", response.url);
//         url_base = url.href;
//         const data = await response.json();
//     }
//     refresh_list();
// }


async function mkdir(e) {
    const response = await fetch(
        new URL("/fs" + current_path + new_directory_name.value + "/", url_base),
        {
            method: "PUT",
            headers: {
                'X-Timestamp': Date.now()
            }
        }
    );
    if (response.ok) {
        refresh_list();
        new_directory_name.value = "";
        mkdir_button.disabled = true;
    }
}

async function upload(e) {
    console.log("upload");
    for (const file of files.files) {
        console.log(file);
        let file_path = new URL("/fs" + current_path + file.name, url_base);
        const response = await fetch(file_path,
            {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-Timestamp': file.lastModified
                },
                body: file
            }
        )
        if (response.ok) {
            refresh_list();
            console.log(files);
            files.value = "";
            upload_button.disabled = true;
        }
    }
}

async function del(e) {
    console.log("delete");
    console.log(e);
    let fn = new URL(e.target.value);
    var prompt = "Delete " + fn.pathname.substr(3);
    if (e.target.value.endsWith("/")) {
        prompt += " and all of its contents?";
    } else {
        prompt += "?";
    }
    if (confirm(prompt)) {
        const response = await fetch(e.target.value,
            {
                method: "DELETE"
            }
        )
        if (response.ok) {
            refresh_list();
        }
    }
}

find_devices();

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

window.onhashchange = refresh_list;
