import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

function findOnPath(command: string): string | null {
  const pathValue = process.env.PATH ?? process.env.Path ?? '';
  const extensions = process.platform === 'win32'
    ? ['', '.exe', '.cmd', '.bat']
    : [''];

  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    for (const extension of extensions) {
      const candidate = join(dir, command.endsWith(extension) ? command : `${command}${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
}

function commandVersion(command: string, args: string[] = ['--version']): Check {
  if (command === 'bun') {
    return {
      name: command,
      ok: true,
      detail: Bun.version,
    };
  }

  const executable = findOnPath(command);
  if (!executable) {
    return {
      name: command,
      ok: false,
      detail: 'not found on PATH',
    };
  }

  let result: ReturnType<typeof Bun.spawnSync>;
  try {
    result = Bun.spawnSync([executable, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
  } catch (error) {
    return {
      name: command,
      ok: false,
      detail: error instanceof Error ? error.message : 'spawn failed',
    };
  }

  const output = `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`.trim();

  return {
    name: command,
    ok: result.exitCode === 0,
    detail: output || `not found or exited with ${result.exitCode}`,
  };
}

function windowsPathCheck(command: string): Check {
  if (process.platform !== 'win32') {
    return {
      name: command,
      ok: false,
      detail: 'Windows-only check skipped on non-Windows host',
    };
  }

  const executable = findOnPath(command);

  return {
    name: command,
    ok: Boolean(executable),
    detail: executable ?? 'not found on PATH',
  };
}

function printCheck(check: Check): void {
  const status = check.ok ? 'OK' : 'MISSING';
  console.log(`${status.padEnd(8)} ${check.name} - ${check.detail.split(/\r?\n/)[0]}`);
}

const checks: Check[] = [
  commandVersion('bun'),
  commandVersion('rustc'),
  commandVersion('cargo'),
  windowsPathCheck('cl.exe'),
];

console.log('Realms of War desktop packaging prerequisite check');
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log('');

for (const check of checks) {
  printCheck(check);
}

console.log('');
console.log('Recommendation: do not add Tauri scaffold until Rust/Cargo/MSVC are installed and the Next app has a static desktop renderer path.');

if (process.argv.includes('--strict') && checks.some((check) => !check.ok)) {
  process.exit(1);
}
