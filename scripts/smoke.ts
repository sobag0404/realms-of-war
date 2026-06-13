const HOST = '127.0.0.1';
const STARTUP_TIMEOUT_MS = 30_000;

type ServerMode = 'production-default' | 'local-alpha';

interface SmokeServer {
  port: number;
  proc: ReturnType<typeof Bun.spawn>;
  output: () => string;
  stop: () => Promise<void>;
}

function requireStandaloneServer() {
  const server = '.next/standalone/server.js';
  if (!Bun.file(server).exists()) {
    throw new Error('Standalone server not found. Run `bun run build` before smoke.');
  }
  return server;
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
        server.close(() => reject(new Error('Failed to allocate smoke port.')));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function getSmokeDatabaseUrl() {
  if (process.env.SMOKE_DATABASE_URL) return process.env.SMOKE_DATABASE_URL;
  const dbPath = `${process.cwd().replaceAll('\\', '/')}/prisma/dev.db`;
  return `file:${dbPath}`;
}

async function readStream(stream: ReadableStream<Uint8Array>, append: (chunk: string) => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      append(decoder.decode(value, { stream: true }));
    }
  } catch {
    // Process shutdown can close streams while the reader is waiting.
  }
}

async function startServer(mode: ServerMode, port: number): Promise<SmokeServer> {
  const server = requireStandaloneServer();
  let output = '';

  const env: Record<string, string> = {
    ...process.env,
    NODE_ENV: 'production',
    HOSTNAME: HOST,
    PORT: String(port),
    DATABASE_URL: getSmokeDatabaseUrl(),
    NEXT_TELEMETRY_DISABLED: '1',
  };

  if (mode === 'local-alpha') {
    env.REALMS_SERVER_SAVES = 'local-alpha';
  } else {
    delete env.REALMS_SERVER_SAVES;
  }

  const proc = Bun.spawn([process.execPath, server], {
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  void readStream(proc.stdout, (chunk) => {
    output += chunk;
  });
  void readStream(proc.stderr, (chunk) => {
    output += chunk;
  });

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  const healthUrl = `http://${HOST}:${port}/`;
  let lastError = '';

  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`Server exited early (${proc.exitCode}) in ${mode} mode.\n${output}`);
    }

    try {
      const response = await fetch(healthUrl);
      if (response.status === 200) {
        return {
          port,
          proc,
          output: () => output,
          stop: async () => {
            proc.kill();
            await Promise.race([proc.exited, Bun.sleep(2_000)]);
          },
        };
      }
      lastError = `GET / returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await Bun.sleep(250);
  }

  proc.kill();
  await Promise.race([proc.exited, Bun.sleep(2_000)]);
  throw new Error(`Server did not become ready in ${mode} mode: ${lastError}\n${output}`);
}

async function expectStatus(url: string, expected: number) {
  const response = await fetch(url);
  const body = await response.text();

  if (response.status !== expected) {
    throw new Error(`Expected ${expected} from ${url}, got ${response.status}: ${body.slice(0, 200)}`);
  }

  return { response, body };
}

async function smokeProductionDefault() {
  const server = await startServer('production-default', await getFreePort());
  try {
    await expectStatus(`http://${HOST}:${server.port}/api/saves`, 403);
    await expectStatus(`http://${HOST}:${server.port}/api/load?id=smoke`, 403);
  } finally {
    await server.stop();
  }
}

async function smokeLocalAlpha() {
  const server = await startServer('local-alpha', await getFreePort());
  try {
    await expectStatus(`http://${HOST}:${server.port}/`, 200);
    const { body } = await expectStatus(`http://${HOST}:${server.port}/api/saves`, 200);
    const parsed = JSON.parse(body) as { saves?: unknown };
    if (!Array.isArray(parsed.saves)) {
      throw new Error(`/api/saves did not return a saves array: ${body.slice(0, 200)}`);
    }
  } finally {
    await server.stop();
  }
}

await smokeProductionDefault();
await smokeLocalAlpha();

console.log('Smoke passed: production save APIs are disabled by default; local-alpha standalone responds.');

export {};
