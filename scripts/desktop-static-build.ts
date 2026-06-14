const result = Bun.spawnSync(['bun', 'x', 'next', 'build'], {
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    ...process.env,
    REALMS_DESKTOP_STATIC_EXPORT: '1',
  },
});

process.exit(result.exitCode);
