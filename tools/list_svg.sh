#!/bin/sh
# SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
# SPDX-License-Identifier: MIT

function greppit() {
	git grep --extended-regexp "([a-z._-]+\.svg)" | perl -ne 'm/([a-z._-]+\.svg)/; print("$1\n")'
	git grep --extended-regexp "_icon\s*\(\s*[\"'][a-z._-]+[\"']\s*\)" | perl -ne 'm/_icon\s*\(\s*["'"'"']([a-z._-]+)["'"'"']\s*\)/; print("$1.svg\n")'
}

list=`greppit | sort | uniq`

function full_list() {
	for file in $list; do
		echo assets/svg/$file
		echo assets/svg/$file.license
	done
}

flist=`full_list`

function unused_files() {
	for file in assets/svg/*; do
		if [[ "$flist" == *"$file"* ]]; then
			# nope
			no="no"
		else
			echo $file
		fi
	done
}

# Unused SVG files
unused_files
