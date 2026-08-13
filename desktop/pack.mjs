import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { readProductVersion, releaseExeName } from '../../PlayerHistory_Server/scripts/productVersion.mjs';
import { setWinIcon } from '../../PlayerHistory_Server/scripts/setWinIcon.mjs';

const desktopRoot = path.dirname(fileURLToPath(import.meta.url));
const electronBuilderCli = createRequire(import.meta.url).resolve('electron-builder/cli.js');
const product = readProductVersion();
const artifactName = releaseExeName('Admin', product);
const label = product.codename ? `v${product.version} (“${product.codename}”)` : `v${product.version}`;
const iconPath = path.join(desktopRoot, 'build', 'icon.ico');

console.log(`[pack] Building portable admin exe ${label} → ${artifactName}`);

const child = spawn(
  process.execPath,
  [electronBuilderCli, '--win', 'portable', `--config.portable.artifactName=${artifactName}`],
  { cwd: desktopRoot, stdio: 'inherit' }
);

function keepOnlyCodenameExe() {
  const releaseDir = path.join(desktopRoot, 'release');
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  if (fs.existsSync(unpackedDir)) {
    fs.rmSync(unpackedDir, { recursive: true, force: true });
  }

  if (!fs.existsSync(releaseDir)) return;
  for (const name of fs.readdirSync(releaseDir)) {
    if (!name.toLowerCase().endsWith('.exe')) continue;
    if (name === artifactName) continue;
    fs.unlinkSync(path.join(releaseDir, name));
    console.log(`[pack] Removed extra exe: ${name}`);
  }
}

function applyIcon(exePath) {
  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath)) return;
  setWinIcon(exePath, iconPath);
  console.log(`[pack] Icon applied: ${path.basename(exePath)}`);
  refreshExplorerIcon(exePath);
}

function refreshExplorerIcon(filePath) {
  const psFile = `${filePath}.refresh-icon.ps1`;
  const escaped = filePath.replace(/'/g, "''");
  const ps = `Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Native {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  public static extern void SHChangeNotify(int eventId, uint flags, [MarshalAs(UnmanagedType.LPWStr)] string item1, [MarshalAs(UnmanagedType.LPWStr)] string item2);
}
"@
$path = '${escaped}'
[Native]::SHChangeNotify(0x00002000, 0x0005 -bor 0x1000, $path, $null)
[Native]::SHChangeNotify(0x08000000, 0x1000, $null, $null)
`;
  fs.writeFileSync(psFile, ps);
  try {
    spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', psFile], { stdio: 'ignore' });
  } finally {
    fs.rmSync(psFile, { force: true });
  }
}

child.on('exit', (code) => {
  if (code) process.exit(code);

  keepOnlyCodenameExe();
  applyIcon(path.join(desktopRoot, 'release', artifactName));

  process.exit(0);
});
