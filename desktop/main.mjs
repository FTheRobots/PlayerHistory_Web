import { app, BrowserWindow, shell } from 'electron';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Fixed port so localStorage persists across app restarts (origin = host + port). */
const STATIC_PORT = 38472;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function staticRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }
  return path.join(__dirname, '..', 'web', 'dist');
}

function createStaticServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname);
        let filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);

        if (!filePath.startsWith(root)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(root, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
          res.end(data);
        });
      } catch {
        res.writeHead(500);
        res.end('Server error');
      }
    });

    server.on('error', reject);
    server.listen(STATIC_PORT, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : STATIC_PORT;
      resolve({ server, port });
    });
  });
}

/** @type {import('http').Server | null} */
let staticServer = null;

async function createWindow() {
  const root = staticRoot();
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    throw new Error(
      `Web build not found at ${root}. Run: cd web && npm run build`
    );
  }

  const { server, port } = await createStaticServer(root);
  staticServer = server;

  const iconPath = path.join(__dirname, 'build', 'icon.ico');

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Player History Admin',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  await win.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  staticServer?.close();
});
