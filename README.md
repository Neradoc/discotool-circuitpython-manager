How to use the Web Workflow
===========================

Quick start
-----------

```sh
git clone https://github.com/Neradoc/circuitpython-web-packager
cd circuitpython-web-packager
python3 -m http.server
echo "http://localhost:8000/workflow.html"
```
Connect to [http://localhost:8000/workflow.html](http://localhost:8000/workflow.html).

How to with human words
-----------------------

- Get all the files of the repository locally.
- Start a server on localhost in the repository's directory.
- Connect to `/workflow.html` on that server.

You need a board with the web workflow enabled ! [See docs here](https://github.com/adafruit/circuitpython/blob/main/docs/workflows.md#web).

Start a server ?
----------------

Easy, call that from the command line while in the repository's directory:
```sh
python -m http.server
```
And connect to [http://localhost:8000/workflow.html](http://localhost:8000/workflow.html).
