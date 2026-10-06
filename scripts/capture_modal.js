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

async function captureModal() {
  const outputPath = '/Users/sittha/.gemini/antigravity/brain/a3f82b0f-c5f9-4503-8bbd-6ac043cebb37/screenshots_step4/desktop_modal_dark_after.png';
  
  // Launch Chrome
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--use-gl=angle',
    'about:blank'
  ]);

  await sleep(2500);

  try {
    let newTabRes;
    for (let i = 0; i < 15; i++) {
      try {
        newTabRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent('http://localhost:5173')}`, { method: 'PUT' });
        if (newTabRes.ok) break;
      } catch {
        await sleep(500);
      }
    }
    const tab = await newTabRes.json();
    const client = new CDPClient(tab.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    client.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('Browser Exception:', JSON.stringify(msg.params.exceptionDetails));
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('Console:', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
      }
    });
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-color-scheme', value: 'dark' }]
    });
    await client.send('Runtime.evaluate', {
      expression: "document.documentElement.classList.add('dark')"
    });

    // Wait for data load
    await sleep(4000);

    // Find and click the first flood card in AlertFeed
    const clickRes = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll("[aria-label*='เซนติเมตร']"));
          if (cards.length > 0) {
            cards[0].click();
            return { clicked: true, text: cards[0].textContent };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true
    });
    console.log('Click result:', clickRes.result.value);

    // Wait for modal animation & chart render
    await sleep(2500);

    const domInfo = await client.send('Runtime.evaluate', {
      expression: "({ modalFound: !!document.querySelector('.fixed.inset-0'), title: document.title, errorEl: document.querySelector('.error')?.textContent, htmlSnippet: document.body.innerHTML.slice(0, 600) })",
      returnByValue: true
    });
    console.log('DOM info:', domInfo.result.value);

    const screenshotRes = await client.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshotRes.data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved modal screenshot: ${outputPath} (${buffer.length} bytes)`);

    client.close();
  } finally {
    chromeProc.kill();
  }
}

captureModal().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
