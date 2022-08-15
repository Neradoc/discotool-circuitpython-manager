"""
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
"""
from secrets import secrets

import board
import math
import time
import adafruit_dotstar as dotstar

NPIXELS = 1
dot = dotstar.DotStar(board.APA102_SCK, board.APA102_MOSI, 1, auto_write=True)
dot.brightness = 0.5

def sine_wheel(angle):
	return 127 + int(127 * math.sin(angle * math.pi / 180))

while True:
	for x in range(360):
		dot[0] = [
			sine_wheel(2 * x),
			sine_wheel(2 * x + 120),
			sine_wheel(2 * x + 240)
		]
		# print(dot[0])
		dot.show()
		time.sleep(0.01)

"""
Switch between animations with the Circuit Playground Express/Bluefruit
Requires adafruit_led_animation
This was tested on the Circuit Playground Express with Circuitpython 7.0.0
"""
import board
import neopixel
from digitalio import DigitalInOut, Pull
import time

from adafruit_led_animation.animation.comet import Comet
from adafruit_led_animation.animation.chase import Chase
from adafruit_led_animation.sequence import AnimationSequence
from adafruit_led_animation.color import PURPLE, AMBER, JADE

button_a = DigitalInOut(board.BUTTON_A)
button_a.switch_to_input(Pull.DOWN)
button_b = DigitalInOut(board.BUTTON_B)
button_b.switch_to_input(Pull.DOWN)
switch = DigitalInOut(board.SLIDE_SWITCH)
switch.switch_to_input(Pull.UP)

pixels = neopixel.NeoPixel(board.NEOPIXEL, 10, auto_write=False)

chase = Chase(pixels, speed=0.04, size=3, spacing=7, color=AMBER)
comet = Comet(pixels, speed=0.02, color=JADE, tail_length=10, bounce=True)
animations = AnimationSequence(comet, chase)

anim = comet

while True:
	animations.animate()
	# lookup buttons to switch between animations
	# next animation
	if button_a.value:
		animations.next()
		# "debounce" by blocking until the button is released
		while button_a.value:
			time.sleep(0.01)
	# pause/resume
	if button_b.value:
		if animations._paused:
			animations.resume()
		else:
			animations.freeze()
		# "debounce" by blocking until the button is released
		while button_b.value:
			time.sleep(0.01)
	# the switch sets the brightness
	if switch.value:
		pixels.brightness = 0.1
	else:
		pixels.brightness = 0.6
	# for slow animations, sleep a bit, but not too long to read buttons
	# time.sleep(min(0.1, anim.speed / 10))

import adafruit_magtag
