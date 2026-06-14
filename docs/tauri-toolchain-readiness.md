# Tauri Toolchain Readiness

Date: 2026-06-14

Status: scaffold available, local build deferred until Rust/MSVC are installed.

Realms of War is now ready for a static desktop renderer, but this machine is not ready to verify a Tauri scaffold. We should not commit a `src-tauri` placeholder until the Rust/MSVC toolchain can build it.

## Current Local Audit

Run:

```powershell
bun run desktop:doctor
```

Observed on this Windows machine:

- Bun: available, `1.3.14`.
- WebView2 Runtime: available, version `149.0.4022.69`.
- `winget.exe`: available.
- `rustc`: missing from `PATH`.
- `cargo`: missing from `PATH`.
- `cl.exe`: missing from `PATH`.
- Visual Studio Build Tools / MSVC C++ toolset: not detected by `vswhere.exe`.
- NSIS/WiX tools: not detected; optional until choosing installer target.

Decision update: a minimal `src-tauri` scaffold is allowed once the static renderer is verified and GitHub Windows workflow can be used as the first artifact path. Local build on this machine remains blocked until Rust/Cargo/MSVC are installed.

## Required Install Commands

Official Tauri prerequisites for Windows require Microsoft C++ Build Tools, WebView2, and Rust with an MSVC host toolchain.

Verified official references on 2026-06-14:

- Tauri Windows prerequisites require Microsoft C++ Build Tools and WebView2; Windows 10 1803+ usually already includes WebView2.
- Rust should use the MSVC host toolchain; `rustup default stable-msvc` is the correction command after Rust installation.
- Tauri + Next.js requires static export and `frontendDist: "../out"`.
- Windows installers can be `.msi` through WiX v3 or `-setup.exe` through NSIS; `bun tauri build` is the build entrypoint.

Recommended install path:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools
winget install --id Rustlang.Rustup
rustup default stable-msvc
```

During Visual Studio Build Tools installation, select `Desktop development with C++`.

Installer tools, only when packaging:

```powershell
winget install --id NSIS.NSIS
winget install --id WiXToolset.WiXToolset
```

Restart the terminal after installation, then rerun:

```powershell
bun run desktop:doctor --strict
bun run desktop:static:audit
bun run desktop:static:build
bun run desktop:static:smoke
```

## Verified Tauri Inputs

Static renderer inputs already pass:

- `bun run desktop:static:build` emits `out/`.
- `bun run desktop:static:smoke` serves `out/` without Next server/API and verifies new game, render, local save, load, and delete.
- Tauri config should use `frontendDist: "../out"`.

## Scaffold Plan

Current scaffold:

- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/build.rs`
- `src-tauri/src/main.rs`
- `src-tauri/capabilities/default.json`
- `src-tauri/icons/icon.ico`

Configuration:

- app id: `com.realmsofwar.game`
- product name: `Realms of War`
- `beforeBuildCommand`: `bun run desktop:static:build`
- `frontendDist`: `../out`
- dev URL: `http://localhost:3000`
- bundle target: unsigned NSIS setup executable
- placeholder Windows resource icon: `src-tauri/icons/icon.ico`
- no signing, updater, auth, cloud, multiplayer, or payment configuration

## Artifact Workflow Findings

The first manual `Windows Desktop Artifact` run reached Rust/Tauri build and failed on the Windows resource icon requirement:

```text
icons/icon.ico not found; required for generating a Windows Resource file during tauri-build
```

This blocker is fixed by adding a small generated placeholder `src-tauri/icons/icon.ico` and referencing it in `tauri.conf.json`. It is not final branding.

After required local checks pass:

1. Run static gates.
2. Build locally:

```powershell
bun run desktop:tauri:build
```

3. Add a Tauri filesystem-backed `DesktopSaveRepository` under app data with atomic writes.

## Manual CI Plan

The manual `Desktop Readiness` GitHub Actions workflow runs static desktop gates on Windows.

The manual `Windows Desktop Artifact` workflow builds the unsigned Tauri Windows artifact on `windows-latest` and uploads `RealmsOfWar-windows-unsigned`. It does not require signing secrets.

GitHub only exposes a newly added `workflow_dispatch` workflow after the workflow file exists on the default branch. Before this PR is merged, attempting to run it by file name returns:

```text
HTTP 404: workflow windows-desktop-artifact.yml not found on the default branch
```

After merge, run:

```powershell
gh workflow run windows-desktop-artifact.yml --ref main
gh run list --workflow "Windows Desktop Artifact" --limit 1
```
