<?php
$base_github = "https://github.com/";
$bundles_config = [
	"adafruit/Adafruit_CircuitPython_Bundle",
	"adafruit/CircuitPython_Community_Bundle",
	"circuitpython/CircuitPython_Org_Bundle",
];
$actions = ["json", "zip"];

$action = "";
if(isset($_GET['action'])) {
	$action = $_GET['action'];
}
$user = "";
if(isset($_GET['user'])) {
	$user = $_GET['user'];
}
$repo = "";
if(isset($_GET['repo'])) {
	$repo = $_GET['repo'];
}
$bundle = "$user/$repo";

if(array_search($bundle, $bundles_config) === false) {
	die("BUNDLE UNKNOWN");
}
if(array_search($action, $actions) === false) {
	die("ACTION INVALID");
}

$url_tag = "$base_github/$bundle/releases/latest";
$headers = get_headers($url_tag, true);
$location = $headers["Location"];
$bundle_tag = array_slice(preg_split("`/`", $location), -1)[0];

$base_name = preg_replace("/_/", "-", strtolower($repo));

if($action == "json") {
	$json_name = "${base_name}-${bundle_tag}.json";
	$url = "${base_github}/${bundle}/releases/download/${bundle_tag}/${json_name}";
	$type = "application/json";
}

if($action == "zip") {
	$zip_name = "${base_name}-7.x-mpy-${bundle_tag}.zip";
	$url = "${base_github}/${bundle}/releases/download/${bundle_tag}/${zip_name}";
	$type = "application/zip";
}

# header('Content-Disposition: attachment; filename="'.$zipname.'"'."\r\n");
header("content-type:$type\r\n");
readfile($url);
