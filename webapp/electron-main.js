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

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });

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
    ELECTRON_RUN_AS_NODE: "1"
  };

  serverProcess = spawn(process.execPath, [serverPath], { env });

  serverProcess.on("error", (err) => {
    console.error(`Failed to start server: ${err.message}`);
    if (mainWindow) {
      mainWindow.webContents.send("server-log", `SYSTEM ERROR: Failed to start server: ${err.message}`);
    }
  });

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

  // Auto Updater logic
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("checking-for-update", () => {
    if (mainWindow) mainWindow.webContents.send("server-log", "SYSTEM: กำลังตรวจสอบการอัปเดต...");
  });
  autoUpdater.on("update-available", (info) => {
    if (mainWindow) mainWindow.webContents.send("server-log", `SYSTEM: มีการอัปเดตเวอร์ชันใหม่: ${info.version}`);
  });
  autoUpdater.on("update-not-available", (info) => {
    if (mainWindow) mainWindow.webContents.send("server-log", "SYSTEM: คุณได้ใช้ BD FB Affiliate เวอร์ชันล่าสุดแล้ว");
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

ipcMain.on("gui-ready", (event) => {
  console.log("RECEIVED gui-ready EVENT!");
  try {
    const version = app.getVersion();
    console.log("Version is: " + version);
    event.sender.send('set-version', version);
  } catch (e) {
    console.log("Error getting version: " + e.message);
    event.sender.send('set-version', '1.0.17');
  }
  startNextJsServer();
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

let botProcess = null;

ipcMain.on("launch-ldplayer", () => {
  const { exec } = require('child_process');
  exec('reg query "HKCU\\Software\\XuanZhi\\LDPlayer9" /v InstallDir', (error, stdout) => {
    if (error) {
      exec('reg query "HKCU\\Software\\XuanZhi\\LDPlayer" /v InstallDir', (err2, stdout2) => {
        if (err2) {
          mainWindow?.webContents.send("server-log", "SYSTEM ERROR: ค้นหา LDPlayer ไม่พบ โปรดติดตั้งโปรแกรมก่อน หรือเปิดด้วยตัวเอง");
          return;
        }
        launchDnplayer(stdout2);
      });
      return;
    }
    launchDnplayer(stdout);
  });

  function launchDnplayer(regOutput) {
    const match = regOutput.match(/InstallDir\s+REG_SZ\s+(.*)/i);
    if (match && match[1]) {
      const installDir = match[1].trim();
      const exePath = path.join(installDir, 'dnplayer.exe');
      mainWindow?.webContents.send("server-log", `SYSTEM: กำลังเปิด ${exePath}...`);
      require('child_process').exec(`"${exePath}"`);
    } else {
      mainWindow?.webContents.send("server-log", "SYSTEM ERROR: ไม่สามารถระบุที่อยู่ของ LDPlayer ได้");
    }
  }
});

ipcMain.on("start-bot", () => {
  if (botProcess) {
    mainWindow?.webContents.send("server-log", "BOT SYSTEM: บอทกำลังทำงานอยู่แล้ว");
    return;
  }

  const isDev = !app.isPackaged;
  const botExePath = isDev
    ? path.join(__dirname, "resources", "bot.exe")
    : path.join(process.resourcesPath, "bot.exe");

  const fs = require('fs');
  if (!fs.existsSync(botExePath)) {
    mainWindow?.webContents.send("server-log", `BOT ERROR: ไม่พบไฟล์บอทที่ ${botExePath}`);
    mainWindow?.webContents.send("bot-status", "stopped");
    return;
  }

  // Load .env.local variables to pass to bot
  const envPath = path.join(__dirname, ".env.local");
  let botEnv = { ...process.env, PYTHONIOENCODING: 'utf-8' };
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        botEnv[match[1].trim()] = match[2].trim();
      }
    });
  }

  botProcess = spawn(botExePath, [], { env: botEnv });
  mainWindow?.webContents.send("bot-status", "started");

  botProcess.stdout.on("data", (data) => {
    if (mainWindow) mainWindow.webContents.send("bot-log", data.toString());
  });

  botProcess.stderr.on("data", (data) => {
    if (mainWindow) mainWindow.webContents.send("bot-log", `ERROR: ${data.toString()}`);
  });

  botProcess.on("close", (code) => {
    if (mainWindow) {
      mainWindow.webContents.send("bot-log", `SYSTEM: บอทปิดการทำงาน (Code: ${code})`);
      mainWindow.webContents.send("bot-status", "stopped");
    }
    botProcess = null;
  });
});

ipcMain.on("stop-bot", () => {
  if (botProcess) {
    botProcess.kill();
    botProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send("bot-log", "SYSTEM: บังคับปิดการทำงานบอทเรียบร้อย...");
      mainWindow.webContents.send("bot-status", "stopped");
    }
  }
});
