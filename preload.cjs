// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const log = require('electron-log');
window.log = log.functions;

window.modulePath = require("path");
window.moduleDrivelist = require("drivelist");
window.moduleFss = require("fs"); // sync
window.moduleFs = require("fs/promises");
window.moduleFsx = require("fs-extra");
window.moduleMdns = require('multicast-dns')()

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})
