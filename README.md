How to use the Web Workflow
===========================

The main code now is for the electron app. There is no guarantte that it will run in a browser anymore. In fact browser security features pretty much preclude that at all, so I finally gave up on that.

Main features
-------------

- List boards connected on USB and web workflow boards that respond to circuitpython.local.
- List files on a board, with multiple file management features.
  - Create, delete, rename, move files and directories.
  - File editor for web workflow with some simple features.
  - Open in your local editor in USB workflow.
  - Download all files for backup purposes.
  - Upload files in bulk.
- Library installer.
  - Search for, and select libraries from the bundle to install them and their dependencies.
  - Find and install all the dependencies for a python file from the file list.
  - Auto install for the current code.py (or main.py, depending on which is available).
- Serial panel for web workflow.
  - Make errors into links to the source file (on web workflow).
  - Make "unknown module" errors into links to install the missing module.

Quick start electron
--------------------

First, have nodejs installed.

```sh
git clone https://github.com/Neradoc/circuitpython-web-packager
cd circuitpython-web-packager
npm install
./node_modules/.bin/electron-rebuild
npm start
```

Build the app with `npm run make`. Good luck.

You need a board with the web workflow enabled ! [See docs here](https://github.com/adafruit/circuitpython/blob/main/docs/workflows.md#web).

The old zip packager
--------------------

It is in `html/bundler.html` and should still work the same.
