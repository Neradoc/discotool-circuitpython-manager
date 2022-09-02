How to use the Web Workflow
===========================

The main code now is for the electron app. You can run it in a browser though as mentioned below, but it won't include USB workflow and might have other limitations, in particular it's possible that it stops working in the future as browsers increasingly block features for security.

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

Quick start browser
-------------------

```sh
git clone https://github.com/Neradoc/circuitpython-web-packager
cd circuitpython-web-packager
python3 -m http.server
echo "http://localhost:8000/index.html"
```
Connect to [http://localhost:8000/index.html](http://localhost:8000/index.html).

How to with human words
-----------------------

- Get all the files of the repository locally.
- Start a server on localhost in the repository's directory.
- Connect to `/index.html` on that server.

You need a board with the web workflow enabled ! [See docs here](https://github.com/adafruit/circuitpython/blob/main/docs/workflows.md#web).

The old zip packager
--------------------

It is in `html/bundler.html` and should still work the same.
