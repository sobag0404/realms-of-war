import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const HOST = '127.0.0.1';
const OUT_DIR = join(process.cwd(), 'out');
const STARTUP_TIMEOUT_MS = 30_000;
const FLOW_TIMEOUT_MS = 60_000;

type CdpMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message?: string };
};

type StaticServer = {
  port: number;
  stop: () => Promise<void>;
};

function assertStaticOutput() {
  if (!existsSync(join(OUT_DIR, 'index.html'))) {
    throw new Error('Static desktop output not found. Run `bun run desktop:static:build` before desktop:static:smoke.');
  }
}

async function getFreePort(): Promise<number> {
  const { createServer } = await import('node:net');
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to allocate port.')));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

function contentType(path: string): string {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

async function startStaticServer(): Promise<StaticServer> {
  assertStaticOutput();
  const port = await getFreePort();

  const server = Bun.serve({
    hostname: HOST,
    port,
    async fetch(request) {
      const url = new URL(request.url);
      const decodedPath = decodeURIComponent(url.pathname);
      const pathname = decodedPath === '/' ? '/index.html' : decodedPath;
      const filePath = join(OUT_DIR, pathname.replace(/^\/+/, ''));
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file, {
          headers: { 'content-type': contentType(filePath) },
        });
      }

      return new Response('Not found', { status: 404 });
    },
  });

  return {
    port,
    stop: async () => {
      await server.stop(true);
    },
  };
}

function edgeCandidates(): string[] {
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env['ProgramFiles(x86)'];

  return [
    ...(localAppData ? [join(localAppData, 'Microsoft/Edge/Application/msedge.exe')] : []),
    ...(programFiles ? [join(programFiles, 'Microsoft/Edge/Application/msedge.exe')] : []),
    ...(programFilesX86 ? [join(programFilesX86, 'Microsoft/Edge/Application/msedge.exe')] : []),
    'msedge.exe',
  ];
}

function findEdge(): string {
  const direct = edgeCandidates().find((candidate) => candidate === 'msedge.exe' || existsSync(candidate));
  if (!direct) {
    throw new Error('Microsoft Edge was not found. Install Edge or add msedge.exe to PATH for desktop static smoke.');
  }
  return direct;
}

async function waitForJson<T>(url: string, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json() as T;
      lastError = `${response.status} ${await response.text()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await Bun.sleep(250);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

class CdpClient {
  private id = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor(private socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message ?? 'CDP command failed'));
      } else {
        pending.resolve(message.result);
      }
    });
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out connecting to browser CDP socket.')), 10_000);
      socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      socket.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('Failed to connect to browser CDP socket.'));
      }, { once: true });
    });
    return new CdpClient(socket);
  }

  send<T = unknown>(method: string, params?: unknown): Promise<T> {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
    });
  }

  close(): void {
    this.socket.close();
  }
}

async function evaluate<T>(cdp: CdpClient, expression: string, timeoutMs = 10_000): Promise<T> {
  const result = await cdp.send<{
    result: { value?: T };
    exceptionDetails?: { text?: string };
  }>('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs,
  });

  if (result.exceptionDetails) {
    throw new Error(`Browser evaluation failed: ${result.exceptionDetails.text ?? expression}`);
  }

  return result.result.value as T;
}

function jsString(value: string): string {
  return JSON.stringify(value);
}

async function waitFor<T>(cdp: CdpClient, expression: string, timeoutMs = FLOW_TIMEOUT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastValue: unknown;

  while (Date.now() < deadline) {
    lastValue = await evaluate<T | null>(cdp, expression);
    if (lastValue) return lastValue as T;
    await Bun.sleep(250);
  }

  throw new Error(`Timed out waiting for browser condition: ${expression}. Last value: ${JSON.stringify(lastValue)}`);
}

async function click(cdp: CdpClient, testId: string): Promise<void> {
  await waitFor(cdp, `Boolean(document.querySelector('[data-testid=${jsString(testId)}]'))`);
  const clicked = await evaluate<boolean>(cdp, `
    (() => {
      const element = document.querySelector('[data-testid=${jsString(testId)}]');
      if (!(element instanceof HTMLElement)) return false;
      element.scrollIntoView({ block: 'center', inline: 'center' });
      element.click();
      return true;
    })()
  `);
  if (!clicked) throw new Error(`Could not click [data-testid=${testId}].`);
}

async function captureHasMeaningfulPixels(cdp: CdpClient): Promise<boolean> {
  const screenshot = await cdp.send<{ data: string }>('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  const image = sharp(Buffer.from(screenshot.data, 'base64'));
  const { data, info } = await image
    .resize(160, 90, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let brightPixels = 0;
  let colorVariance = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (r + g + b > 72) brightPixels++;
    colorVariance += max - min;
  }

  const total = data.length / info.channels;
  return brightPixels / total > 0.02 && colorVariance / total > 4;
}

async function runBrowserFlow(baseUrl: string): Promise<void> {
  const debugPort = await getFreePort();
  const userDataDir = join(process.cwd(), `.desktop-static-smoke-${Date.now()}`);
  mkdirSync(userDataDir, { recursive: true });

  const proc = Bun.spawn([
    findEdge(),
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    `${baseUrl}/`,
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let cdp: CdpClient | null = null;
  try {
    await waitForJson<{ webSocketDebuggerUrl: string }>(`http://${HOST}:${debugPort}/json/version`, STARTUP_TIMEOUT_MS);
    const targets = await waitForJson<Array<{ type: string; url: string; webSocketDebuggerUrl: string }>>(
      `http://${HOST}:${debugPort}/json/list`,
      STARTUP_TIMEOUT_MS,
    );
    const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
    if (!pageTarget) {
      throw new Error('Browser did not expose a page CDP target.');
    }
    cdp = await CdpClient.connect(pageTarget.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: `${baseUrl}/` });

    await waitFor(cdp, `document.readyState === 'complete'`);
    await click(cdp, 'main-menu-new-game');
    await click(cdp, 'new-game-start');
    await waitFor(cdp, `Boolean(document.querySelector('canvas'))`);
    await waitFor(cdp, `Boolean(document.querySelector('[data-testid="turn-save-game"]'))`);

    const canvasInfo = await evaluate<{ width: number; height: number }>(cdp, `
      (() => {
        const canvas = document.querySelector('canvas');
        return canvas ? { width: canvas.width, height: canvas.height } : { width: 0, height: 0 };
      })()
    `);
    if (canvasInfo.width < 100 || canvasInfo.height < 100) {
      throw new Error(`Canvas dimensions are too small: ${canvasInfo.width}x${canvasInfo.height}`);
    }

    if (!(await captureHasMeaningfulPixels(cdp))) {
      throw new Error('Captured static app screenshot did not contain enough visible rendered pixels.');
    }

    await click(cdp, 'turn-save-game');
    await Bun.sleep(1_000);
    const storageState = await evaluate(cdp, `
      new Promise((resolve) => {
        try {
          const request = indexedDB.open('realms-of-war-local-saves');
          request.onerror = () => resolve({ ok: false, error: String(request.error) });
          request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('saves')) {
              resolve({ ok: true, count: -1, stores: Array.from(db.objectStoreNames) });
              return;
            }
            const tx = db.transaction('saves', 'readonly');
            const count = tx.objectStore('saves').count();
            count.onsuccess = () => resolve({ ok: true, count: count.result });
            count.onerror = () => resolve({ ok: false, error: String(count.error) });
          };
        } catch (error) {
          resolve({ ok: false, error: String(error) });
        }
      })
    `);
    console.log(`IndexedDB save count after save click: ${JSON.stringify(storageState)}`);
    await click(cdp, 'turn-back-to-menu');
    await click(cdp, 'main-menu-load-game');
    await waitFor(cdp, `document.querySelectorAll('[data-testid="save-list-entry"]').length === 1`);
    await click(cdp, 'save-list-load');
    await waitFor(cdp, `Boolean(document.querySelector('[data-testid="turn-save-game"]'))`);
    await click(cdp, 'turn-back-to-menu');
    await click(cdp, 'main-menu-load-game');
    await waitFor(cdp, `document.querySelectorAll('[data-testid="save-list-entry"]').length === 1`);
    await click(cdp, 'save-list-delete');
    await waitFor(cdp, `document.querySelectorAll('[data-testid="save-list-entry"]').length === 0`);
  } finally {
    cdp?.close();
    proc.kill();
    await Promise.race([proc.exited, Bun.sleep(2_000)]);
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

const server = await startStaticServer();
try {
  await runBrowserFlow(`http://${HOST}:${server.port}`);
} finally {
  await server.stop();
}

console.log('Desktop static smoke passed: out/ served without Next server/API; new game, render, local save/load/delete verified.');

export {};
