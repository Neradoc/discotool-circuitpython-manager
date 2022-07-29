/*
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
*/

import * as common from "./workflow-common.js";

export var modules_list = [];

var circup = null;
var DEBUG = common.DEBUG;

/***************************************************************
*** NOTE THE UI PART
*/

// the zip code is running, the button won't respond
var zipping = false;

/***************************************************************
*** NOTE Colorize list of modules
*/

function color_the_lists() {
	function color_list(i,that) {
		$(that).removeClass("pair0");
		$(that).removeClass("pair1");
		$(that).addClass(`pair${i%2}`);
	}
	$("#bundle_modules p:visible").each(color_list);
	$("#bundle_dependencies p:visible").each(color_list);
}

/***************************************************************
*** NOTE Manage the dependencies list
*/

function update_dependencies_list() {
	modules_list = [];
	$("#bundle_modules .selected .module").each((i,that) => {
		var module = $(that).html();
		circup.get_dependencies(module, modules_list);
	});
	modules_list.sort();
	$("#bundle_dependencies").html("");
	var pair = 0;
	for(var index in modules_list) {
		pair = pair + 1;
		var module_name = modules_list[index];
		var module = circup.get_module(module_name);
		if(module === false) { continue; } // skip external modules
		var ext = "";
		if(!module.package) {
			ext = ".mpy";
		}
		$("#bundle_dependencies").append(
			`<p class="pair${pair%2}"><span class="module">${module.name}</span>${ext}</p>`
		);
	}
	$(".num_deps").html(pair);
	$("#zip_link").hide();
	$("#zip_in_progress").hide();
}

/***************************************************************
*** NOTE Filter modules by name
*/

function filter_the_modules() {
	var that = $("#bundle_filter input");
	var search_string = that.val().trim();
	if(search_string == "") {
		$("#bundle_clear_search").removeClass("enabled");
		$("#bundle_modules p").show();
		color_the_lists();
		return;
	}
	$("#bundle_clear_search").addClass("enabled");
	var list_search = search_string.split(" ").filter(i => i);
	$("#bundle_modules p").each((i,item) => {
		var module_name = $(item).children(".module").html();
		var matches = false;
		list_search.forEach((sstring) => {
			if(module_name.match(sstring)) {
				matches = true;
			}
		});
		if(!matches) {
			$(item).hide();
		} else {
			$(item).show();
		}
	});
	color_the_lists();
}

$(document).on("keyup", "#bundle_filter input", (event) => {
	filter_the_modules();
});

$(document).on("click", "#bundle_clear_search", (event) => {
	$("#bundle_filter input").val("");
	filter_the_modules();
});

/***************************************************************
*** NOTE Manually select and deselect modules
*/

function toggle_deselect() {
	nselected = $(".selected").length;
	if(nselected > 0) {
		$("#bundle_deselect_all").addClass("enabled");
		$("#nselected").html(`(${nselected} selected)`);
	} else {
		$("#bundle_deselect_all").removeClass("enabled");
		$("#nselected").html("");
	}
}

$(document).on("click", "#bundle_modules p", (event) => {
	// "this" should work but doesn't, "target" can be the internal span or img
	var that = $(event.target).parents().addBack().filter("#bundle_modules p");
	var checkbox = that.find(".checkbox");
	if(!zipping) {
		that.toggleClass("selected");
		update_dependencies_list();
		toggle_deselect();
	}
	checkbox.prop("checked", that.hasClass("selected"))
});

$(document).on("click", "#bundle_deselect_all", (event) => {
	if(zipping) return;
	$(".selected").removeClass("selected");
	$("#bundle_modules p .checkbox").prop("checked", false);
	update_dependencies_list();
	toggle_deselect();
});

/***************************************************************
*** NOTE Init the content of the modules list
*/

async function fill_modules_list() {
	var keys = Object.keys(circup.all_the_modules);
	$("#bundle_modules .loading_image").hide();
	keys.sort();
	keys.forEach((module_name, pair) => {
		var nd1 = circup.all_the_modules[module_name].dependencies.length;
		var nd2 = circup.all_the_modules[module_name].external_dependencies.length;
		var num_deps = "";
		if(DEBUG) { num_deps = `(${nd1+nd2})`; }
		$("#bundle_modules").append(
			`<p>
				<input class="checkbox" type="checkbox"/>
				<span class="module">${module_name}</span> ${num_deps}
			</p>`
		);
	});
	filter_the_modules();
}

export async function start(circup_in) {
	circup = circup_in;
	await fill_modules_list();
}
