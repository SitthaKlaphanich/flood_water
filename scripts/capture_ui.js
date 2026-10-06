import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function takeScreenshot({ width, height, isDark, outputPath, url, action }) {
  console.log(`Capturing: ${path.basename(outputPath)} (${width}x${height}, dark=${isDark})...`);
  
  // 1. Fetch available target from http://127.0.0.1:9222/json/new with retry
  let newTabRes;
  for (let i = 0; i < 15; i++) {
    try {
      newTabRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
      if (newTabRes.ok) break;
    } catch {
      await sleep(500);
    }
  }
  if (!newTabRes) throw new Error('Could not connect to Chrome debug port');
  const tab = await newTabRes.json();
  const client = new CDPClient(tab.webSocketDebuggerUrl);
  await client.connect();

  try {
    await client.send('Page.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600
    });

    await client.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-color-scheme', value: isDark ? 'dark' : 'light' }]
    });

    // Toggle html.dark class explicitly
    await client.send('Runtime.evaluate', {
      expression: isDark ? "document.documentElement.classList.add('dark')" : "document.documentElement.classList.remove('dark')"
    });

    // Wait for MapLibre and React to render
    await sleep(4000);

    if (action) {
      await action(client);
      await sleep(1500);
    }

    const screenshotRes = await client.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshotRes.data, 'base64');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved: ${outputPath} (${buffer.length} bytes)`);
  } finally {
    client.close();
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${tab.id}`).catch(() => {});
  }
}

async function main() {
  const targetDir = process.argv[2] || '/Users/sittha/.gemini/antigravity/brain/a3f82b0f-c5f9-4503-8bbd-6ac043cebb37/screenshots_step1';
  const prefix = process.argv[3] || 'before';

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--use-gl=angle',
    'about:blank'
  ]);

  await sleep(2500);

  try {
    const configs = [
      { width: 1440, height: 900, isDark: true, name: `desktop_dark_${prefix}.png` },
      { width: 1440, height: 900, isDark: false, name: `desktop_light_${prefix}.png` },
      { width: 390, height: 844, isDark: true, name: `mobile_dark_${prefix}.png` },
      { width: 390, height: 844, isDark: false, name: `mobile_light_${prefix}.png` },
    ];

    for (const cfg of configs) {
      await takeScreenshot({
        width: cfg.width,
        height: cfg.height,
        isDark: cfg.isDark,
        outputPath: path.join(targetDir, cfg.name),
        url: 'http://localhost:5173'
      });
    }

    // Capture modal screenshot
    await takeScreenshot({
      width: 1440,
      height: 900,
      isDark: true,
      outputPath: path.join(targetDir, `desktop_modal_dark_${prefix}.png`),
      url: 'http://localhost:5173',
      action: async (client) => {
        await client.send('Runtime.evaluate', {
          expression: `
            const floodCard = document.querySelector("[aria-label^='จุดน้ำท่วม']") || Array.from(document.querySelectorAll("[role='button']")).find(el => el.textContent.includes("ซม."));
            if (floodCard) floodCard.click();
          `
        });
      }
    });
  } finally {
    chromeProc.kill();
  }
}

main().catch(err => {
  console.error('Capture script error:', err);
  process.exit(1);
});
