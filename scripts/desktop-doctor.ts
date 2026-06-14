import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

type Check = {
  name: string;
  ok: boolean;
  detail: string;
  required?: boolean;
};

function findOnPath(command: string): string | null {
  const pathValue = [process.env.PATH, process.env.Path]
    .filter((value): value is string => Boolean(value))
    .join(delimiter);
  const extraDirs = process.platform === 'win32' && process.env.LOCALAPPDATA
    ? [join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps')]
    : [];
  const extensions = process.platform === 'win32'
    ? ['', '.exe', '.cmd', '.bat']
    : [''];

  for (const dir of [...pathValue.split(delimiter), ...extraDirs]) {
    if (!dir) continue;
    for (const extension of extensions) {
      const candidate = join(dir, command.endsWith(extension) ? command : `${command}${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }

  if (process.platform === 'win32') {
    try {
      const result = Bun.spawnSync(['where.exe', command], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const first = result.stdout?.toString().split(/\r?\n/).find(Boolean);
      if (result.exitCode === 0 && first) return first.trim();
    } catch {
      // PATH lookup fallback only.
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
      required: true,
    };
  }

  const executable = findOnPath(command);
  if (!executable) {
    return {
      name: command,
      ok: false,
      detail: 'not found on PATH',
      required: true,
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
      required: true,
    };
  }

  const output = `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`.trim();

  return {
    name: command,
    ok: result.exitCode === 0,
    detail: output || `not found or exited with ${result.exitCode}`,
    required: true,
  };
}

function windowsPathCheck(command: string, required = true): Check {
  if (process.platform !== 'win32') {
    return {
      name: command,
      ok: false,
      detail: 'Windows-only check skipped on non-Windows host',
      required,
    };
  }

  const executable = findOnPath(command);

  return {
    name: command,
    ok: Boolean(executable),
    detail: executable ?? 'not found on PATH',
    required,
  };
}

function optionalCommand(command: string, args: string[] = ['--version']): Check {
  const check = commandVersion(command, args);
  return { ...check, required: false };
}

function registryCheck(name: string, path: string, property: string): Check {
  if (process.platform !== 'win32') {
    return {
      name,
      ok: false,
      detail: 'Windows-only check skipped on non-Windows host',
      required: true,
    };
  }

  let result: ReturnType<typeof Bun.spawnSync>;
  try {
    result = Bun.spawnSync([
      'powershell.exe',
      '-NoProfile',
      '-Command',
      `$value = (Get-ItemProperty -LiteralPath '${path}' -ErrorAction SilentlyContinue).${property}; if ($value) { Write-Output $value; exit 0 } else { exit 1 }`,
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : 'registry check spawn failed',
      required: true,
    };
  }

  const output = `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`.trim();

  return {
    name,
    ok: result.exitCode === 0,
    detail: output || `${property} not found in ${path}`,
    required: true,
  };
}

function visualStudioBuildToolsCheck(): Check {
  const vswhere = findOnPath('vswhere.exe') ??
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe';

  if (!existsSync(vswhere)) {
    return {
      name: 'Visual Studio Build Tools',
      ok: false,
      detail: 'vswhere.exe not found',
      required: true,
    };
  }

  let result: ReturnType<typeof Bun.spawnSync>;
  try {
    result = Bun.spawnSync([
      vswhere,
      '-latest',
      '-products',
      '*',
      '-requires',
      'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
      '-property',
      'installationPath',
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
  } catch (error) {
    return {
      name: 'Visual Studio Build Tools',
      ok: false,
      detail: error instanceof Error ? error.message : 'vswhere spawn failed',
      required: true,
    };
  }
  const output = `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`.trim();

  return {
    name: 'Visual Studio Build Tools',
    ok: result.exitCode === 0 && output.length > 0,
    detail: output || 'MSVC C++ toolset component not found',
    required: true,
  };
}

function printCheck(check: Check): void {
  const status = check.ok ? 'OK' : 'MISSING';
  const scope = check.required === false ? 'optional' : 'required';
  console.log(`${status.padEnd(8)} ${check.name} (${scope}) - ${check.detail.split(/\r?\n/)[0]}`);
}

const checks: Check[] = [
  commandVersion('bun'),
  commandVersion('rustc'),
  commandVersion('cargo'),
  windowsPathCheck('cl.exe'),
  visualStudioBuildToolsCheck(),
  registryCheck(
    'WebView2 Runtime',
    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'pv',
  ),
  windowsPathCheck('winget.exe', false),
  optionalCommand('makensis'),
  optionalCommand('candle.exe'),
  optionalCommand('light.exe'),
];

console.log('Realms of War desktop packaging prerequisite check');
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log('');

for (const check of checks) {
  printCheck(check);
}

console.log('');
console.log('Recommendation: do not add Tauri scaffold until required checks pass. NSIS/WiX are installer-target choices and can remain optional until packaging.');

if (process.argv.includes('--strict') && checks.some((check) => check.required !== false && !check.ok)) {
  process.exit(1);
}
