const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

function createWindow () {
  const win = new BrowserWindow({
    width: 480,
    height: 262,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
    }
  });

  win.loadFile('index.html');
  //win.removeMenu();
}

app.whenReady().then(() => {
  createWindow()
})
