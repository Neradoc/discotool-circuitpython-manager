/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import { BUNDLE_ACCESS } from "../../config.js";
import * as common from "./common.js";
import * as tools from "../lib/tools.js";

async function init_page() {
	/* get the workflow connection/instance
	- from a common pool setup somewhere ?
	- from the main process, via preload ?
	- create another one ?
		- that's not gonna work for BLE ?
	- have a factory class that
		- creates new ones if necessary
		- returns the existing one if it exists
		- (using unique identifiers http://IP | file://DRIVE ...
	*/
	/* get the file path from the URL parameters
	- all in one parameter ?
		- file:///Volumes/CIRCUITPY/code.py
		- http://192.168.1.1/fs/code.py
	*/
	// setup the save command/path (probably only needs the same path)
	/* check the modifiable state
	- display a lock and disable saving
	- check and update it periodically (5s ?)
	*/
	// get the file content from the workflow
	// setup the editor with the file's content
}

init_page();
