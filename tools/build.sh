#!/bin/sh
# SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
# SPDX-License-Identifier: MIT

npx electron-forge make --platform=linux --arch=x64
npm run make
