#!/bin/sh
# SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
# SPDX-License-Identifier: MIT

npm run make
python -c 'print("#"*70)'
echo "npx electron-forge make --platform=linux --arch=x64"
