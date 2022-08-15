"""
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
"""
import board
import mdns
import microcontroller
import socketpool
import time
import wifi

from adafruit_httpserver import HTTPServer, HTTPResponse
from adafruit_lc709203f import LC709203F, PackSize
