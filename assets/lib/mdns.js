/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
import { DEBUG, sleep } from "../lib/tools.js"
const CP_LOCAL_DOMAIN = "circuitpython.local"

const module_mdns = window.moduleMdns
var candidates = {}
var everything_else = {}
var mdns = null

function available() {
	return module_mdns != undefined
}

function query() {
	if(!available()) return
	mdns.query({ questions:[{ name: CP_LOCAL_DOMAIN, type: 'A' }]})
}

function set_responder() {
	mdns.on('response', function(response) {
		if(response.type == "response") {
			var candidate = {
				port: 80,
				hostname: "",
				instance_name: "",
				ip: "",
			}
			var ref = ""
			for(var ads of response.additionals) {
				if(ads.type == "A" && ads.data) {
					candidate.hostname = ads.name
					candidate.ip = ads.data
				}
			}
			for(var ans of response.answers) {
				if(ans.type == "A") {
					candidate.hostname = ans.name
					candidate.ip = ans.data
				}
				if(ans.type == "SRV") {
					candidate.hostname = ans.data.target
					candidate.port = ans.data.port
					candidate.instance_name = ans.name.split(".")[0]
				}
				if(ans.type == "PTR") {
					var tmp_ref = ans.name.split(".")[0]
					if(tmp_ref == "_circuitpython") {
						ref = tmp_ref
						candidate.instance_name = ans.data.split(".")[0]
					}
				}
				if(ans.type == "TXT") {
					// console.log("TXT", ans.data)
				}
			}
			const start_with_cpy = (
				candidate.hostname && candidate.hostname.startsWith("cpy-")
			)
			const is_cp_local = (candidate.hostname == CP_LOCAL_DOMAIN)
			if(ref == "_circuitpython" || start_with_cpy || is_cp_local) {
				if(candidates[candidate.ip] == undefined) {
					candidates[candidate.ip] = candidate
					if(DEBUG) {
						console.log("New board", candidate)
					}
				} else {
					if(candidates[candidate.ip].hostname == CP_LOCAL_DOMAIN) {
						candidates[candidate.ip].hostname = candidate.hostname
					}
					if(candidates[candidate.ip].instance_name == "") {
						candidates[candidate.ip].instance_name = candidate.instance_name
					}
				}
			} else {
				if(candidate.ip) {
					everything_else[candidate.ip] = candidate
				}
				if(candidate.hostname && candidate.hostname.includes("cpy-")) {
					if(DEBUG) {
						console.log("*".repeat(70))
						console.log('candidate:', candidate)
						console.log('got a response packet:', response)
					}
				}
			}
		}
	})
}

async function start_scan() {
	if(!available()) return
	if(mdns == null) {
		mdns = module_mdns()
		set_responder()
	}
	query()
}

async function close() {
	mdns.destroy()
	mdns = null
}

function get_candidates() {
	return structuredClone(candidates)
}

async function scan_for_candidates() {
	await start_scan()
	await sleep(1.5)
	const candidates = await get_candidates()
	await close()
	return candidates
}

start_scan()

export { start_scan, query, get_candidates, available, close, scan_for_candidates }
