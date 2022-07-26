<?php
/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

$base_github = "https://github.com/";
$bundles_config = [
	["adafruit", "Adafruit_CircuitPython_Bundle"],
	["adafruit", "CircuitPython_Community_Bundle"],
	["circuitpython", "CircuitPython_Org_Bundle"],
	["Neradoc", "Circuitpython_Keyboard_Layouts"],
];
$actions = ["json", "zip"];
$CACHEDIR = "bundle";

$debug = true;

foreach($bundles_config as $bundle_info) {
	$user = $bundle_info[0];
	$repo = $bundle_info[1];
	$bundle = implode("/", $bundle_info);

	$url_tag = "$base_github/$bundle/releases/latest";
	$headers = false;
	while(!$headers) {
		if($debug) print("<p>URL tag: $url_tag</p>");
		$headers = get_headers($url_tag, true);
	}
	if($debug) print("<p>Headers: ".print_r($headers, true)."</p>");
	$location = $headers["Location"];
	if($debug) print("<p>Location: $location</p>");
	$bundle_tag = array_slice(preg_split("`/`", $location), -1)[0];
	if($debug) print("<p>Tag: $bundle_tag</p>");

	if($bundle_tag == "") {
		die("Error in bundle tag $location");
	}

	$base_name = preg_replace("/_/", "-", strtolower($repo));
	if($debug) print("<p>$base_name</p>");
	@mkdir($CACHEDIR, 0777, true);

	foreach($actions as $action) {
		if($action == "json") {
			$json_name = "${base_name}-${bundle_tag}.json";
			$file_name = $json_name;
			$url = "${base_github}/${bundle}/releases/download/${bundle_tag}/${json_name}";
		} else if($action == "zip") {
			$zip_name = "${base_name}-7.x-mpy-${bundle_tag}.zip";
			$file_name = $zip_name;
			$url = "${base_github}/${bundle}/releases/download/${bundle_tag}/${zip_name}";
		}

		$cache_file = "$CACHEDIR/$file_name";

		if($debug) print("<p>$file_name</p>");
		if($debug) print("<p>$url</p>");

		if(!file_exists($cache_file) || filesize($cache_file) == 0) {
			if($debug) print("<p>NO CACHE</p>");
			$data = file_get_contents($url);
			if($debug) print_r($data);
			file_put_contents($cache_file, $data);
		}
	}

	$tagfile = "${repo}-latest.json";
	$output = json_encode({$repo => $bundle_tag});
	file_put_contents($tagfile, $output);
}
