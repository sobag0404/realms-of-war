# Windows Artifact Smoke

Date: 2026-06-14

Status: unsigned portable exe and NSIS installer both pass local smoke.

## Artifact

Source workflow:

- Run: https://github.com/sobag0404/realms-of-war/actions/runs/27511030159
- Artifact name: `RealmsOfWar-windows-unsigned`
- Local inspection path: `C:\Users\pcia0\Documents\STR\realms-of-war-artifacts\pr15-27510619482`

Artifact contents inspected locally:

- `realms-of-war.exe` - 9,338,368 bytes
- `bundle\nsis\Realms of War_0.2.0_x64-setup.exe` - 2,684,820 bytes

No artifact binaries are committed to the repository.

## Player Download And Run Steps

1. Open the workflow run:
   https://github.com/sobag0404/realms-of-war/actions/runs/27511030159
2. Download the `RealmsOfWar-windows-unsigned` artifact from the run page.
3. Extract the downloaded `.zip`.
4. For the portable smoke path, run:

```text
realms-of-war.exe
```

5. The app should open a `Realms of War` window and load the main menu.
6. Click `New game`, keep the default setup, then click `Start game`.
7. The map should render with the desktop HUD and playable hex grid.
8. Click the save button in the top-right action row. A saved notification should appear.

## Unsigned Installer Notes

The artifact also contains:

```text
bundle\nsis\Realms of War_0.2.0_x64-setup.exe
```

This setup file is unsigned. Windows SmartScreen or antivirus software may warn that the publisher is unknown. That is expected for the current development artifact.

Do not treat this installer as a production release yet:

- no code signing
- no updater
- no final app icon/branding
- no installer upgrade QA matrix

Use the top-level `realms-of-war.exe` for the quickest smoke path. Use the setup executable when specifically testing install/uninstall behavior.

## Installer Playtest Steps

Interactive path:

1. Run `bundle\nsis\Realms of War_0.2.0_x64-setup.exe`.
2. Accept the Windows unsigned-publisher warning if shown.
3. Install Realms of War.
4. Launch the installed app.
5. Start a new game and save once.
6. Verify saves are written under:

```text
%APPDATA%\com.realmsofwar.game\saves
```

Silent user-safe smoke path used locally:

```powershell
$installDir = "$env:TEMP\realms-of-war-installer-smoke"
& ".\bundle\nsis\Realms of War_0.2.0_x64-setup.exe" /S "/D=$installDir"
& "$installDir\realms-of-war.exe"
& "$installDir\uninstall.exe" /S
```

The `/D=...` argument must be the final installer argument for NSIS.

## Smoke Result

Verified locally on Windows from the downloaded artifact:

- Portable `realms-of-war.exe` starts.
- Native window title is `Realms of War`.
- WebView2 child process starts.
- Main menu renders.
- New game setup panel opens.
- Default new game starts.
- Gameplay map renders nonblank.
- Save button works and shows a saved notification.
- NSIS setup installs successfully to a temp user directory with `/S /D=...`.
- Installed `realms-of-war.exe` starts from the temp install directory.
- Installed app reaches gameplay and saves successfully.
- `uninstall.exe /S` removes the temp install directory.

Screenshots were captured outside the repo:

- `C:\Users\pcia0\AppData\Local\Temp\realms-windows-artifact-smoke-game.png`
- `C:\Users\pcia0\AppData\Local\Temp\realms-windows-artifact-newgame-modal.png`
- `C:\Users\pcia0\AppData\Local\Temp\realms-windows-artifact-gameplay.png`
- `C:\Users\pcia0\AppData\Local\Temp\realms-windows-artifact-save.png`
- `C:\Users\pcia0\AppData\Local\Temp\realms-installer-smoke-save2.png`

Installer smoke was run only through a reversible temp-directory install. No generated installer artifacts are committed.

## Current Limitations

- The artifact is unsigned.
- The icon is still a placeholder.
- Tauri filesystem saves were verified in the PR #15 branch artifact.
- Load/delete are covered by `bun run desktop:static:smoke`; manual Tauri smoke confirmed startup, new game, render, save, filesystem save path, installed-app launch, and uninstall cleanup.
- Local Tauri builds on this machine still require Rust/Cargo/MSVC installation; GitHub Actions is the verified artifact path.

## Next Milestone

Recommended next milestone: add a signed release plan and replace placeholder branding assets.
