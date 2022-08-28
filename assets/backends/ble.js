/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/
import { Workflow, WorkflowResponse, WorkflowFile } from "./workflow_base.js"
import * as tools from "../lib/tools.js"

class BLEWorkflow extends Workflow {
	constructor() {
		super()
	}
	icon = "📱"
	type = "ble"
	static available = false
	static supports_credentials = false
}

export { BLEWorkflow };
