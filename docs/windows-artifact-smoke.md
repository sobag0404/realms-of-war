# Windows Artifact Smoke

Date: 2026-06-14

Status: first unsigned Windows artifact opens and reaches gameplay.

## Artifact

Source workflow:

- Run: https://github.com/sobag0404/realms-of-war/actions/runs/27509390827
- Artifact name: `RealmsOfWar-windows-unsigned`
- Local inspection path: `C:\Users\pcia0\Documents\STR\realms-of-war-artifacts\main-27509390827`

Artifact contents inspected locally:

- `realms-of-war.exe` - 9,309,696 bytes
- `bundle\nsis\Realms of War_0.2.0_x64-setup.exe` - 2,667,911 bytes

No artifact binaries are committed to the repository.

## Player Download And Run Steps

1. Open the workflow run:
   https://github.com/sobag0404/realms-of-war/actions/runs/27509390827
2. Download the `RealmsOfWar-windows-unsigned` artifact from the run page.
3. Extract the downloaded `.zip`.
4. For the safest first smoke test, run:

```text
realms-of-war.exe
```

5. The app should open a `Realms of War` window and load the main menu.
6. Click `Новая игра`, keep the default setup, then click `Начать игру`.
7. The map should render with the desktop HUD and playable hex grid.
8. Click the save button in the top-right action row. A `Сохранено` notification should appear.

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
- no installer hardening
- no uninstall/upgrade QA matrix

Use the top-level `realms-of-war.exe` for the current smoke path unless specifically testing installer behavior.

## Smoke Result

Verified locally on Windows from the downloaded main artifact:

- Portable `realms-of-war.exe` starts.
- Native window title is `Realms of War`.
- WebView2 child process starts.
- Main menu renders.
- New game setup panel opens.
- Default new game starts.
- Gameplay map renders nonblank.
- Save button works and shows `Сохранено`.

Screenshots were captured outside the repo:

- `C:\Users\pcia0\AppData\Local\Temp\realms-windows-artifact-smoke-game.png`
- `C:\Users\pcia0\AppData\Local\Temp\realms-windows-artifact-newgame-modal.png`
- `C:\Users\pcia0\AppData\Local\Temp\realms-windows-artifact-gameplay.png`
- `C:\Users\pcia0\AppData\Local\Temp\realms-windows-artifact-save.png`

Installer execution was intentionally skipped in automation because it changes the user system. Run installer smoke in a later installer-hardening milestone with an explicit install directory, uninstall check, and cleanup checklist.

## Current Limitations

- The artifact is unsigned.
- The icon is still a placeholder.
- Tauri still uses the browser-local IndexedDB save path; a filesystem-backed `DesktopSaveRepository` is not implemented yet.
- Load/delete are fully covered by `bun run desktop:static:smoke`; this manual Tauri smoke confirmed startup, new game, render, and save in the actual WebView2 runtime.
- Local Tauri builds on this machine still require Rust/Cargo/MSVC installation; GitHub Actions is the verified artifact path.

## Next Milestone

Recommended next milestone: add a Tauri filesystem-backed `DesktopSaveRepository` under app data with atomic writes, then harden the installer flow.
