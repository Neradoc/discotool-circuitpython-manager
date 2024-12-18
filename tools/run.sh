#!/bin/sh
# SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
# SPDX-License-Identifier: MIT

if [[ "$1" == build ]]
then
	npm run make
	# electron-packager . CirpyManager --overwrite --platform win32 --arch x64 --out _build/ --ignore="^/_.*"
	# electron-packager . CirpyManager --overwrite --platform darwin --out _build/ --ignore="^/_.*"

	# electron-packager . CirpyManager --overwrite --asar --platform=win32 --arch=ia32 --icon=assets/icons/win/icon.ico --prune=true --out=_build --version-string.CompanyName=Neradoc --version-string.FileDescription=Neradoc --version-string.ProductName="Cirpy Manager"

	# electron-packager . CirpyManager --all --out _build/
	# https://www.npmjs.com/package/electron-installer-windows
	
	# ./node_modules/.bin/electron-rebuild
else
	npm start
	# npx electron .
fi

if [[ "$1" == "SCROUBOULIFLIPELCHABIDOU" ]]
then

	npm i -D electron
	npm i -D electron-rebuild
	./node_modules/.bin/electron-rebuild
	npm i drivelist
	./node_modules/.bin/electron-rebuild
	npm i fs-extra
	./node_modules/.bin/electron-rebuild
	npm i multicast-dns
	./node_modules/.bin/electron-rebuild
	npm i node-powershell
	./node_modules/.bin/electron-rebuild
	npm i path
	./node_modules/.bin/electron-rebuild

	npm install --save-dev @electron-forge/cli
	npx electron-forge import

	npm run make

fi
