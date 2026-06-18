import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const HOST = '127.0.0.1';
const OUT_DIR = join(process.cwd(), 'out');
const STARTUP_TIMEOUT_MS = 30_000;
const FLOW_TIMEOUT_MS = 60_000;
const DEFAULT_ARTIFACT_DIR = 'C:/Users/pcia0/Documents/STR/realms-of-war-artifacts/graphics-evidence';
const artifactDir = process.env.REALMS_GRAPHICS_EVIDENCE_DIR ?? DEFAULT_ARTIFACT_DIR;
const externalBaseUrl = process.env.REALMS_GRAPHICS_EVIDENCE_URL;
const scenario = process.env.REALMS_GRAPHICS_EVIDENCE_SCENARIO === 'showcase' ? 'showcase' : 'default';

const viewports = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

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

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type EvidenceEntry = {
  viewport: string;
  screenshot: string;
  stats: {
    brightRatio: number;
    averageVariance: number;
  };
  layout: {
    canvas: Rect | null;
    criticalControls: Array<{ id: string; rect: Rect | null }>;
    offscreenCriticalControls: string[];
    criticalOverlaps: Array<{ a: string; b: string; area: number }>;
  };
  frameSample: {
    frames: number;
    averageMs: number;
    p95Ms: number;
    maxMs: number;
    over50Ms: number;
  };
};

function assertStaticOutput() {
  if (!existsSync(join(OUT_DIR, 'index.html'))) {
    throw new Error('Static desktop output not found. Run `bun run desktop:static:build` before `bun run graphics:evidence`.');
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
      const candidates = [
        join(OUT_DIR, pathname.replace(/^\/+/, '')),
        join(OUT_DIR, `${pathname.replace(/^\/+/, '')}.html`),
        join(OUT_DIR, pathname.replace(/^\/+/, ''), 'index.html'),
      ];

      for (const filePath of candidates) {
        const file = Bun.file(filePath);
        if (!await file.exists()) continue;
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
    throw new Error('Microsoft Edge was not found. Install Edge or add msedge.exe to PATH for graphics evidence capture.');
  }
  return direct;
}

function removeDirectoryBestEffort(path: string): void {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Warning: could not remove temporary browser profile ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
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

async function pixelStats(png: Buffer): Promise<{ brightRatio: number; averageVariance: number }> {
  const { data, info } = await sharp(png)
    .resize(200, 120, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bright = 0;
  let variance = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (r + g + b > 72) bright++;
    variance += max - min;
  }

  const total = data.length / info.channels;
  return { brightRatio: bright / total, averageVariance: variance / total };
}

async function collectLayout(cdp: CdpClient, viewport: { width: number; height: number }) {
  return await evaluate<EvidenceEntry['layout']>(cdp, `
    (() => {
      const viewport = { width: ${viewport.width}, height: ${viewport.height} };
      const toRect = (rect) => rect ? ({
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      }) : null;
      const area = (rect) => Math.max(0, rect.width) * Math.max(0, rect.height);
      const overlapArea = (a, b) => {
        const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        return Number((width * height).toFixed(2));
      };
      const inViewport = (rect) => rect &&
        rect.x >= -1 &&
        rect.y >= -1 &&
        rect.x + rect.width <= viewport.width + 1 &&
        rect.y + rect.height <= viewport.height + 1;
      const canvasElement = document.querySelector('canvas');
      const canvas = canvasElement ? toRect(canvasElement.getBoundingClientRect()) : null;
      const criticalIds = ['turn-back-to-menu', 'turn-save-game'];
      const criticalControls = criticalIds.map((id) => {
        const element = document.querySelector('[data-testid="' + id + '"]');
        return { id, rect: element ? toRect(element.getBoundingClientRect()) : null };
      });
      const offscreenCriticalControls = criticalControls
        .filter((control) => !control.rect || area(control.rect) < 16 || !inViewport(control.rect))
        .map((control) => control.id);
      const criticalOverlaps = [];
      for (let index = 0; index < criticalControls.length; index++) {
        const a = criticalControls[index];
        if (!a.rect) continue;
        for (let next = index + 1; next < criticalControls.length; next++) {
          const b = criticalControls[next];
          if (!b.rect) continue;
          const overlap = overlapArea(a.rect, b.rect);
          if (overlap > 1) criticalOverlaps.push({ a: a.id, b: b.id, area: overlap });
        }
      }
      return { canvas, criticalControls, offscreenCriticalControls, criticalOverlaps };
    })()
  `);
}

async function collectFrameSample(cdp: CdpClient): Promise<EvidenceEntry['frameSample']> {
  return await evaluate<EvidenceEntry['frameSample']>(cdp, `
    new Promise((resolve) => {
      const samples = [];
      let last = performance.now();
      const target = 90;
      function step(now) {
        samples.push(now - last);
        last = now;
        if (samples.length >= target) {
          const total = samples.reduce((sum, value) => sum + value, 0);
          const sorted = [...samples].sort((a, b) => a - b);
          const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
          resolve({
            frames: samples.length,
            averageMs: Number((total / samples.length).toFixed(2)),
            p95Ms: Number(p95.toFixed(2)),
            maxMs: Number(Math.max(...samples).toFixed(2)),
            over50Ms: samples.filter((value) => value > 50).length,
          });
        } else {
          requestAnimationFrame(step);
        }
      }
      requestAnimationFrame(step);
    })
  `, 20_000);
}

async function runViewport(cdp: CdpClient, baseUrl: string, viewport: { width: number; height: number }): Promise<EvidenceEntry> {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Storage.clearDataForOrigin', {
    origin: new URL(baseUrl).origin,
    storageTypes: 'all',
  });
  const path = scenario === 'showcase' ? '/graphics-showcase' : '/';
  await cdp.send('Page.navigate', { url: `${baseUrl}${path}` });

  await waitFor(cdp, `document.readyState === 'complete'`);
  if (scenario === 'default') {
    await click(cdp, 'main-menu-new-game');
    await click(cdp, 'new-game-start');
  } else {
    await waitFor(cdp, `Boolean(document.querySelector('[data-testid="graphics-showcase-route"]'))`);
  }
  await waitFor(cdp, `Boolean(document.querySelector('canvas'))`);
  await waitFor(cdp, `Boolean(document.querySelector('[data-testid="turn-save-game"]'))`);
  await Bun.sleep(2_400);

  const x = Math.floor(viewport.width * 0.5);
  const y = Math.floor(viewport.height * 0.52);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
  if (scenario === 'default') {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await Bun.sleep(600);

  const layout = await collectLayout(cdp, viewport);
  if (!layout.canvas || layout.canvas.width < 100 || layout.canvas.height < 100) {
    throw new Error(`${viewport.width}x${viewport.height}: canvas is missing or too small.`);
  }
  if (layout.offscreenCriticalControls.length > 0) {
    throw new Error(`${viewport.width}x${viewport.height}: offscreen critical controls: ${layout.offscreenCriticalControls.join(', ')}`);
  }
  if (layout.criticalOverlaps.length > 0) {
    throw new Error(`${viewport.width}x${viewport.height}: critical control overlaps: ${JSON.stringify(layout.criticalOverlaps)}`);
  }

  const frameSample = await collectFrameSample(cdp);
  const screenshot = await cdp.send<{ data: string }>('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  const png = Buffer.from(screenshot.data, 'base64');
  const stats = await pixelStats(png);
  if (stats.brightRatio <= 0.02 || stats.averageVariance <= 4) {
    throw new Error(`${viewport.width}x${viewport.height}: screenshot failed pixel check: ${JSON.stringify(stats)}`);
  }

  const screenshotPath = join(artifactDir, `graphics-${scenario}-evidence-${viewport.width}x${viewport.height}.png`);
  writeFileSync(screenshotPath, png);

  return {
    viewport: `${viewport.width}x${viewport.height}`,
    screenshot: screenshotPath,
    stats,
    layout,
    frameSample,
  };
}

async function runEvidence(baseUrl: string): Promise<EvidenceEntry[]> {
  const debugPort = await getFreePort();
  const userDataDir = join(artifactDir, `.edge-graphics-evidence-${Date.now()}`);
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
    await cdp.send('Input.setIgnoreInputEvents', { ignore: false });

    const entries: EvidenceEntry[] = [];
    for (const viewport of viewports) {
      const entry = await runViewport(cdp, baseUrl, viewport);
      entries.push(entry);
      console.log(`${entry.viewport}: ${JSON.stringify({
        screenshot: entry.screenshot,
        stats: entry.stats,
        frameSample: entry.frameSample,
        offscreenCriticalControls: entry.layout.offscreenCriticalControls,
        criticalOverlaps: entry.layout.criticalOverlaps,
      })}`);
    }
    return entries;
  } finally {
    cdp?.close();
    proc.kill();
    await Promise.race([proc.exited, Bun.sleep(2_000)]);
    removeDirectoryBestEffort(userDataDir);
  }
}

mkdirSync(artifactDir, { recursive: true });
const server = externalBaseUrl ? null : await startStaticServer();
const baseUrl = externalBaseUrl ?? `http://${HOST}:${server!.port}`;

try {
  const entries = await runEvidence(baseUrl);
  const reportPath = join(artifactDir, 'graphics-evidence-report.json');
  writeFileSync(reportPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl,
    scenario,
    entries,
  }, null, 2)}\n`);
  console.log(`Graphics evidence report: ${reportPath}`);
} finally {
  await server?.stop();
}
