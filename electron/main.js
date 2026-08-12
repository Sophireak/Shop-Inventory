const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  session,
  ipcMain,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow = null;
let serverProcess = null;
let splashWindow = null;

const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const isDev = !app.isPackaged;

// ============================================
// SERVER FUNCTIONS
// ============================================

function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (
            res.statusCode === 200 ||
            res.statusCode === 307 ||
            res.statusCode === 404
          ) {
            resolve();
          } else {
            retry();
          }
        })
        .on("error", retry);
    };
    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error("Server timeout"));
        return;
      }
      setTimeout(check, 500);
    };
    check();
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      console.log("Dev mode: server already running");
      waitForServer(SERVER_URL).then(resolve).catch(reject);
      return;
    }

    const cwd = path.join(process.resourcesPath, "app");
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

    serverProcess = spawn(npmCmd, ["run", "start"], {
      cwd,
      shell: true,
      env: {
        ...process.env,
        PORT: SERVER_PORT.toString(),
        NODE_ENV: "production",
      },
    });

    serverProcess.stdout.on("data", (data) => console.log(`Server: ${data}`));
    serverProcess.stderr.on("data", (data) =>
      console.error(`Server Error: ${data}`),
    );
    serverProcess.on("error", reject);

    waitForServer(SERVER_URL).then(resolve).catch(reject);
  });
}

// ============================================
// SPLASH SCREEN
// ============================================

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false },
  });

  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Noto Sans Khmer', Arial, sans-serif; color: white; user-select: none; }
        .container { text-align: center; padding: 40px; }
        .icon { font-size: 80px; margin-bottom: 20px; animation: pulse 1.5s infinite; }
        h1 { margin: 10px 0; font-size: 28px; }
        p { margin: 5px 0; opacity: 0.9; font-size: 14px; }
        .loader { margin-top: 20px; width: 40px; height: 40px;
          border: 4px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🏪</div>
        <h1>ហាងខ្ញុំ</h1>
        <p>ប្រព័ន្ធគ្រប់គ្រងស្តុក</p>
        <div class="loader"></div>
        <p style="margin-top: 20px; font-size: 12px;">កំពុងបើក... សូមរង់ចាំ</p>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`,
  );
  splashWindow.center();
}

// ============================================
// MAIN WINDOW
// ============================================

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#f9fafb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "🏪 ហាងខ្ញុំ - ប្រព័ន្ធគ្រប់គ្រងស្តុក",
  });

  try {
    mainWindow.setIcon(path.join(__dirname, "icon.ico"));
  } catch (e) {
    console.log("No icon file found");
  }

  mainWindow.loadURL(SERVER_URL);

  mainWindow.once("ready-to-show", () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle downloads (Excel, Backup)
  session.defaultSession.on("will-download", (event, item) => {
    const fileName = item.getFilename();

    dialog
      .showSaveDialog(mainWindow, {
        title: "រក្សាទុកឯកសារ",
        defaultPath: path.join(app.getPath("downloads"), fileName),
        filters: [
          fileName.endsWith(".xlsx")
            ? { name: "Excel Files", extensions: ["xlsx"] }
            : fileName.endsWith(".db")
              ? { name: "Database Files", extensions: ["db"] }
              : { name: "All Files", extensions: ["*"] },
        ],
      })
      .then((result) => {
        if (result.canceled) {
          item.cancel();
        } else {
          item.setSavePath(result.filePath);
        }
      });

    item.on("done", (event, state) => {
      if (state === "completed") {
        dialog.showMessageBox(mainWindow, {
          type: "info",
          title: "ជោគជ័យ!",
          message: "✅ បានទាញយកជោគជ័យ!",
          detail: `ឯកសារ: ${fileName}\nរក្សាទុកទី: ${item.getSavePath()}`,
          buttons: ["យល់ព្រម"],
        });
      } else if (state !== "cancelled") {
        dialog.showErrorBox("កំហុស", `មិនអាចទាញយកបានទេ: ${state}`);
      }
    });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes("/api/export") ||
      url.includes("/api/backup") ||
      url.includes("localhost")
    ) {
      mainWindow.webContents.downloadURL(url);
      return { action: "deny" };
    }
    if (url.startsWith("http")) {
      require("electron").shell.openExternal(url);
    }
    return { action: "deny" };
  });
}

// ============================================
// IPC HANDLERS - PDF & PRINT
// ============================================

// Save current page as PDF (clean, no browser headers!)
ipcMain.handle("save-as-pdf", async (event, options) => {
  if (!mainWindow) return { success: false, error: "No window" };

  try {
    const filename = (options && options.filename) || "report.pdf";

    // Ask where to save
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "រក្សាទុក PDF",
      defaultPath: path.join(app.getPath("downloads"), filename),
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    // Generate clean PDF
    const pdfData = await mainWindow.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      landscape: false,
      margins: {
        marginType: "custom",
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4,
      },
      preferCSSPageSize: true,
    });

    fs.writeFileSync(result.filePath, pdfData);

    // Show success dialog
    const openResult = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "ជោគជ័យ!",
      message: "✅ បានរក្សាទុក PDF!",
      detail: `រក្សាទុកទី: ${result.filePath}`,
      buttons: ["បើក PDF", "យល់ព្រម"],
      defaultId: 0,
      cancelId: 1,
    });

    if (openResult.response === 0) {
      require("electron").shell.openPath(result.filePath);
    }

    return { success: true, path: result.filePath };
  } catch (error) {
    console.error("PDF error:", error);
    dialog.showErrorBox("កំហុស", "មិនអាចបង្កើត PDF: " + error.message);
    return { success: false, error: error.message };
  }
});

// Print current page directly
ipcMain.handle("print-page", async () => {
  if (!mainWindow) return { success: false };

  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
        pageSize: "A4",
        margins: {
          marginType: "custom",
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4,
        },
      },
      (success, errorType) => {
        if (!success && errorType !== "cancelled") {
          dialog.showErrorBox("កំហុស", "មិនអាចបោះពុម្ព: " + errorType);
        }
        resolve({ success });
      },
    );
  });
});

// ============================================
// APPLICATION MENU
// ============================================

function setupMenu() {
  const template = [
    {
      label: "ហាង",
      submenu: [
        {
          label: "ផ្ទុកឡើងវិញ",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.reload(),
        },
        { type: "separator" },
        {
          label: "ចាកចេញ",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "មើល",
      submenu: [
        {
          label: "ពង្រីក",
          accelerator: "CmdOrCtrl+=",
          click: () => {
            const zoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(zoom + 0.5);
          },
        },
        {
          label: "បង្រួម",
          accelerator: "CmdOrCtrl+-",
          click: () => {
            const zoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(zoom - 0.5);
          },
        },
        {
          label: "ទំហំធម្មតា",
          accelerator: "CmdOrCtrl+0",
          click: () => mainWindow.webContents.setZoomLevel(0),
        },
        { type: "separator" },
        {
          label: "អេក្រង់ពេញ",
          accelerator: "F11",
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
      ],
    },
    {
      label: "ជំនួយ",
      submenu: [
        {
          label: "អំពី",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "អំពី ហាងខ្ញុំ",
              message: "🏪 ហាងខ្ញុំ",
              detail: "ប្រព័ន្ធគ្រប់គ្រងស្តុក\nកំណែ 1.0.0",
              buttons: ["យល់ព្រម"],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(async () => {
  createSplashScreen();

  try {
    await startServer();
    setupMenu();
    createMainWindow();
  } catch (error) {
    console.error("Startup error:", error);
    if (splashWindow) splashWindow.close();
    dialog.showErrorBox(
      "កំហុសក្នុងការចាប់ផ្តើម",
      "មិនអាចចាប់ផ្តើមម៉ាស៊ីនមេបានទេ។\n\n" + error.message,
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createMainWindow();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
