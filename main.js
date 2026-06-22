const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { generateWallet, queryAddress, performTransfer, testConnection } = require('./ethereum.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    resizable: true,
    title: 'TRC20 Wallet Pro',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

ipcMain.handle('generate-wallet', async () => {
  return await generateWallet();
});

ipcMain.handle('query-balance', async (event, address) => {
  return queryAddress(address);
});

ipcMain.handle('transfer', async (event, privateKey, token, to, amount) => {
  return performTransfer(privateKey, token, to, amount);
});

ipcMain.handle('test-connection', async () => {
  return await testConnection();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});