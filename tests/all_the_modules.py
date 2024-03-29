"""
SPDX-FileCopyrightText: Copyright (c) 2022 Neradoc, https://neradoc.me
SPDX-License-Identifier: MIT
"""
import adafruit_24lc32
import adafruit_74hc595
import adafruit_ads1x15
import adafruit_adt7410
import adafruit_adxl34x
import adafruit_adxl37x
import adafruit_ahtx0
import adafruit_airlift
import adafruit_am2320
import adafruit_amg88xx
import adafruit_apds9960
import adafruit_as726x
import adafruit_as7341
import adafruit_atecc
import adafruit_avrprog
import adafruit_aw9523
import adafruit_aws_iot
import adafruit_azureiot
import adafruit_bd3491fs
import adafruit_bh1750
import adafruit_binascii
import adafruit_bitbangio
import adafruit_bitmap_font
import adafruit_bitmapsaver
import adafruit_ble
import adafruit_ble_adafruit
import adafruit_ble_apple_media
import adafruit_ble_apple_notification_center
import adafruit_ble_berrymed_pulse_oximeter
import adafruit_ble_broadcastnet
import adafruit_ble_cycling_speed_and_cadence
import adafruit_ble_eddystone
import adafruit_ble_heart_rate
import adafruit_ble_ibbq
import adafruit_ble_lywsd03mmc
import adafruit_ble_magic_light
import adafruit_ble_midi
import adafruit_ble_radio
import adafruit_bluefruit_connect
import adafruit_bluefruitspi
import adafruit_bme280
import adafruit_bme680
import adafruit_bmp280
import adafruit_bmp3xx
import adafruit_bno055
import adafruit_bno08x
import adafruit_bno08x_rvc
import adafruit_boardtest
import adafruit_bus_device
import adafruit_button
import adafruit_cap1188
import adafruit_ccs811
import adafruit_character_lcd
import adafruit_circuitplayground
import adafruit_clue
import adafruit_crickit
import adafruit_cursorcontrol
import adafruit_dash_display
import adafruit_datetime
import adafruit_debouncer
import adafruit_debug_i2c
import adafruit_dht
import adafruit_discordbot
import adafruit_display_notification
import adafruit_display_shapes
import adafruit_display_text
import adafruit_displayio_layout
import adafruit_displayio_sh1106
import adafruit_displayio_sh1107
import adafruit_displayio_ssd1305
import adafruit_displayio_ssd1306
import adafruit_dotstar
import adafruit_dps310
import adafruit_drv2605
import adafruit_ds1307
import adafruit_ds1841
import adafruit_ds18x20
import adafruit_ds2413
import adafruit_ds3231
import adafruit_ds3502
import adafruit_ducky
import adafruit_dymoscale
import adafruit_emc2101
import adafruit_epd
import adafruit_esp32s2tft
import adafruit_esp32spi
import adafruit_espatcontrol
import adafruit_fakerequests
import adafruit_fancyled
import adafruit_featherwing
import adafruit_fingerprint
import adafruit_focaltouch
import adafruit_fona
import adafruit_fram
import adafruit_framebuf
import adafruit_funhouse
import adafruit_fxas21002c
import adafruit_fxos8700
import adafruit_gc_iot_core
import adafruit_gizmo
import adafruit_gps
import adafruit_hashlib
import adafruit_hcsr04
import adafruit_hid
import adafruit_ht16k33
import adafruit_hts221
import adafruit_httpserver
import adafruit_htu21d
import adafruit_htu31d
import adafruit_hue
import adafruit_hx8357
import adafruit_icm20x
import adafruit_il0373
import adafruit_il0398
import adafruit_il91874
import adafruit_ili9341
import adafruit_imageload
import adafruit_ina219
import adafruit_ina260
import adafruit_io
import adafruit_irremote
import adafruit_is31fl3731
import adafruit_is31fl3741
import adafruit_itertools
import adafruit_jwt
import adafruit_l3gd20
import adafruit_lc709203f
import adafruit_led_animation
import adafruit_lidarlite
import adafruit_lifx
import adafruit_lis2mdl
import adafruit_lis331
import adafruit_lis3dh
import adafruit_lis3mdl
import adafruit_logging
import adafruit_lps2x
import adafruit_lps35hw
import adafruit_lsm303
import adafruit_lsm303_accel
import adafruit_lsm303dlh_mag
import adafruit_lsm6ds
import adafruit_lsm9ds0
import adafruit_lsm9ds1
import adafruit_ltr390
import adafruit_macropad
import adafruit_magtag
import adafruit_matrixkeypad
import adafruit_matrixportal
import adafruit_max31855
import adafruit_max31856
import adafruit_max31865
import adafruit_max7219
import adafruit_max9744
import adafruit_mcp230xx
import adafruit_mcp2515
import adafruit_mcp3xxx
import adafruit_mcp4725
import adafruit_mcp4728
import adafruit_mcp9600
import adafruit_mcp9808
import adafruit_midi
import adafruit_miniesptool
import adafruit_minimqtt
import adafruit_miniqr
import adafruit_mlx90393
import adafruit_mlx90395
import adafruit_mlx90614
import adafruit_mlx90640
import adafruit_mma8451
import adafruit_monsterm4sk
import adafruit_motor
import adafruit_motorkit
import adafruit_mpl115a2
import adafruit_mpl3115a2
import adafruit_mpr121
import adafruit_mprls
import adafruit_mpu6050
import adafruit_ms8607
import adafruit_msa301
import adafruit_neokey
import adafruit_neotrellis
import adafruit_ntp
import adafruit_nunchuk
import adafruit_oauth2
import adafruit_onewire
import adafruit_ov2640
import adafruit_ov5640
import adafruit_ov7670
import adafruit_pca9685
import adafruit_pcd8544
import adafruit_pcf8523
import adafruit_pcf8563
import adafruit_pcf8591
import adafruit_pct2075
import adafruit_pioasm
import adafruit_pixel_framebuf
import adafruit_pixelbuf
import adafruit_pixie
import adafruit_pm25
import adafruit_pn532
import adafruit_portalbase
import adafruit_progressbar
import adafruit_pybadger
import adafruit_pyoa
import adafruit_pyportal
import adafruit_ra8875
import adafruit_radial_controller
import adafruit_register
import adafruit_requests
import adafruit_rfm69
import adafruit_rfm9x
import adafruit_rgb_display
import adafruit_rgbled
import adafruit_rockblock
import adafruit_rplidar
import adafruit_rsa
import adafruit_rtttl
import adafruit_scd30
import adafruit_scd4x
import adafruit_sdcard
import adafruit_seesaw
import adafruit_servokit
import adafruit_sgp30
import adafruit_sgp40
import adafruit_sharpmemorydisplay
import adafruit_sht31d
import adafruit_sht4x
import adafruit_shtc3
import adafruit_si4713
import adafruit_si5351
import adafruit_si7021
import adafruit_simple_text_display
import adafruit_simplemath
import adafruit_slideshow
import adafruit_soundboard
import adafruit_ssd1305
import adafruit_ssd1306
import adafruit_ssd1322
import adafruit_ssd1325
import adafruit_ssd1327
import adafruit_ssd1331
import adafruit_ssd1351
import adafruit_ssd1608
import adafruit_ssd1675
import adafruit_ssd1680
import adafruit_ssd1681
import adafruit_st7565
import adafruit_st7735
import adafruit_st7735r
import adafruit_st7789
import adafruit_stmpe610
import adafruit_tc74
import adafruit_tca9548a
import adafruit_tcs34725
import adafruit_tfmini
import adafruit_thermal_printer
import adafruit_thermistor
import adafruit_ticks
import adafruit_tinylora
import adafruit_tla202x
import adafruit_tlc5947
import adafruit_tlc59711
import adafruit_tlv493d
import adafruit_tmp006
import adafruit_tmp007
import adafruit_tmp117
import adafruit_touchscreen
import adafruit_tpa2016
import adafruit_trellis
import adafruit_trellism4
import adafruit_tsc2007
import adafruit_tsl2561
import adafruit_tsl2591
import adafruit_tt21100
import adafruit_turtle
import adafruit_uc8151d
import adafruit_us100
import adafruit_vc0706
import adafruit_vcnl4010
import adafruit_vcnl4040
import adafruit_veml6070
import adafruit_veml6075
import adafruit_veml7700
import adafruit_vl53l0x
import adafruit_vl53l1x
import adafruit_vl53l4cd
import adafruit_vl6180x
import adafruit_vs1053
import adafruit_waveform
import adafruit_wiznet5k
import adafruit_ws2801
import adafruit_wsgi
import ansi_escape_code
import arrowline
import asynccp
import asyncio
import azurecustomvision_prediction
import barbudor_ina3221
import barbudor_tmp75
import biffobear_as3935
import bluepad32
import bteve
import candlesticks
import circuitpython_base64
import circuitpython_csv
import circuitpython_display_frame
import circuitpython_functools
import circuitpython_hmac
import circuitpython_nrf24l01
import circuitpython_parse
import circuitpython_schedule
import circuitpython_ticstepper
import colorsys
import community_tca9555
import displayio_annotation
import dotstar_featherwing
import dynamixel
import electronutlabs_ili9163
import electronutlabs_lis2dh12
import electronutlabs_ltr329als01
import example
import foamyguy_nvm_helper
import gamblor21_ahrs
import gc9a01
import hcsr04
import i2c_button
import i2cencoderlibv21
import ifttt
import jepler_udecimal
import mitutoyo
import morsecode
import neopixel
import neopixel_spi
import nonblocking_serialinput
import nonblocking_timer
import odt_at42qt1070
import pimoroni_circuitpython_ltr559
import pimoroni_mics6814
import piper_blockly
import sh1106
import simpleio
import slight_tlc5957
import sparkfun_qwiicas3935
import sparkfun_qwiicjoystick
import sparkfun_qwiickeypad
import sparkfun_qwiicrelay
import sparkfun_qwiictwist
import sparkfun_serlcd
import styles
import trellism4_extended
import wiichuck
import wws_74hc165
import adafruit_bus_device
import adafruit_ht16k33
