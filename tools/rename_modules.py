"""
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
"""
import glob
import json
import re

EXCLUDES = ["images", "svg", "extlib", "backends"]

files_paths = [
	file.split("/")[-2:]
	for file in glob.glob("assets/*/*")
	if file.split("/")[-2] not in EXCLUDES
]
scripts = glob.glob("assets/*/*.js")
csses = glob.glob("assets/*/*.css")
htmls = glob.glob("html/*.html")

for source in scripts:
	if source.split("/")[-2] in EXCLUDES:
		continue

	with open(source, "r") as fp:
		data = fp.read()

	output = data.split("\n")

	for num, line in enumerate(output):
		if not line.startswith("import "): continue

		for path_dir, path_name in files_paths:
			if path_name not in line: continue

			line_out = line.replace(
				f"./{path_name}",
				f"../{path_dir}/{path_name}"
			)
			if line_out != line:
				#print(line)
				#print(line_out)
				output[num] = line_out

	outputs = "\n".join(output)

	if outputs != data:
		print(f"Update file: {source}")
		with open(source, "w") as fp:
			fp.write(outputs)


for source in csses:
	if source.split("/")[-2] in EXCLUDES:
		continue

	with open(source, "r") as fp:
		data = fp.read()

	output = data.split("\n")

	for num, line in enumerate(output):
		if "@import" not in line: continue

		for path_dir, path_name in files_paths:
			if path_name not in line: continue

			line_out = line.replace(
				f"{path_name}",
				f"../{path_dir}/{path_name}"
			)
			if line_out != line:
				output[num] = line_out
		

	outputs = "\n".join(output)

	if outputs != data:
		print(f"Update file: {source}")
		with open(source, "w") as fp:
			fp.write(outputs)


for source in htmls:
	if source.split("/")[-2] in EXCLUDES:
		continue

	with open(source, "r") as fp:
		data = fp.read()

	output = data.split("\n")

	for num, line in enumerate(output):
		# if "@import" not in line: continue

		for path_dir, path_name in files_paths:
			if path_name not in line: continue
			if path_dir in EXCLUDES: continue


			line_out = re.sub(
				f"/[^/]+/{path_name}",
				f"/{path_dir}/{path_name}",
				line,
			)
			if line_out != line:
				output[num] = line_out
				#print(line)
				#print(line_out)
		

	outputs = "\n".join(output)

	if outputs != data:
		print(f"Update file: {source}")
		with open(source, "w") as fp:
			fp.write(outputs)

