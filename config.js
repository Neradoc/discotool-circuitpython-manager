/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

// proxy from neradoc.me, so it works when running locally without php
export const BUNDLE_ACCESS = "proxy:https://neradoc.me/bundler/proxy.php"
export var WORKFLOW_USERNAME = "" // can only be empty for now
export var WORKFLOW_PASSWORD = "passw0rd" // default, overriden by the password field
export var DEBUG_DEFAULT = false // override the "default" param or set to null
export var OPEN_IN_BROWSER = false // open links to web workflow files/serial in browser
export var DISPLAY_GITHUB_LINK = true // show link to github repositories
