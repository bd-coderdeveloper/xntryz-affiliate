const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow;
let serverProcess;
const PORT = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "BD FB Affiliate Launcher",
    icon: path.join(__dirname, "upfeed_logo.png"),
    autoHideMenuBar: true,
  });

  mainWindow.loadFile("launcher-gui.html");

  mainWindow.on("closed", function () {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  });
}

function startNextJsServer() {
  const isDev = !app.isPackaged;

  // In dev mode, we might just be testing the GUI. 
  // We'll try to run the standalone server if it exists.
  const serverPath = isDev
    ? path.join(__dirname, ".next", "standalone", "server.js")
    : path.join(process.resourcesPath, "standalone_app", "server.js");

  // Set env vars
  const env = {
    ...process.env,
    PORT: PORT.toString(),
    HOSTNAME: "localhost",
    NODE_ENV: "production",
  };

  serverProcess = spawn("node", [serverPath], { env });

  serverProcess.stdout.on("data", (data) => {
    const msg = data.toString();
    console.log(`[Next.js] ${msg}`);
    if (mainWindow) {
      mainWindow.webContents.send("server-log", msg);
    }
  });

  serverProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    console.error(`[Next.js Error] ${msg}`);
    if (mainWindow) {
      mainWindow.webContents.send("server-log", `ERROR: ${msg}`);
    }
  });

  serverProcess.on("close", (code) => {
    console.log(`Next.js เกิดข้อผิดพลาด : ${code}`);
    if (mainWindow) {
      mainWindow.webContents.send("server-log", `SYSTEM: ระบบเกิดข้อผิดพลาด : ${code}`);
    }
  });
}

app.on("ready", () => {
  createWindow();
  startNextJsServer();

  // Auto Updater logic
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("checking-for-update", () => {
    if (mainWindow) mainWindow.webContents.send("server-log", "SYSTEM: กำลังตรวจสอบการอัปเดต...");
  });
  autoUpdater.on("update-available", (info) => {
    if (mainWindow) mainWindow.webContents.send("server-log", `SYSTEM: มีการอัปเดตเวอร์ชันใหม่: ${info.version}`);
  });
  autoUpdater.on("update-not-available", (info) => {
    if (mainWindow) mainWindow.webContents.send("server-log", "SYSTEM: คุณได้ใช้ UPFEEDTH เวอร์ชันล่าสุดแล้ว");
  });
  autoUpdater.on("error", (err) => {
    if (mainWindow) mainWindow.webContents.send("server-log", "ERROR: เกิดข้อผิดพลาดในการอัปเดตอัตโนมัติ " + err);
  });
  autoUpdater.on("download-progress", (progressObj) => {
    let log_message = `SYSTEM: ความเร็วในการดาวน์โหลด: ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s`;
    log_message += ` - ดาวน์โหลดแล้ว ${Math.round(progressObj.percent)}%`;
    if (mainWindow) mainWindow.webContents.send("server-log", log_message);
  });
  autoUpdater.on("update-downloaded", (info) => {
    if (mainWindow) mainWindow.webContents.send("server-log", "SYSTEM: ดาวน์โหลดเสร็จสิ้น! กำลังเริ่มการทำงานใหม่...");
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 1000);
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (mainWindow === null) createWindow();
});

// IPC handler to open the browser
ipcMain.on("open-browser", () => {
  shell.openExternal(`http://localhost:${PORT}`);
});

ipcMain.on("stop-server", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send("server-log", "SYSTEM: ปิดการทำงานเรียบร้อย...");
    }
  }
});
