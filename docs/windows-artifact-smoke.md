# Windows Artifact Smoke

Date: 2026-06-15

Status: reusable smoke checklist for the unsigned Windows desktop playtest
artifact. Player-facing download and uninstall steps live in
[`download/README.md`](../download/README.md).

## Artifact Source

Current handoff:

- Release:
  <https://github.com/sobag0404/realms-of-war/releases/tag/v0.2.0-unsigned-playtest.7>
- Commit: `1b5633656720d7b8bcad7e410b9438eed14213b7`
- Main CI: <https://github.com/sobag0404/realms-of-war/actions/runs/27649570366>
- Windows artifact workflow:
  <https://github.com/sobag0404/realms-of-war/actions/runs/27650115373>
- Local inspection path:
  `C:\Users\pcia0\Documents\STR\realms-of-war-artifacts\main-1b563365-run-27650115373`

Current release checksums:

```text
5E82599D68B1AEE82B2040FAFDA792C2A32244B5A84535DB5A79D6BE4A0F5D8A  realms-of-war.exe
D24DCA2EB95912D425091772B5F18613ACDEA53F30B18866D5A55C9A06169D50  RealmsOfWar-0.2.0-windows-x64-setup.exe
```

Use the manual GitHub Actions workflow:

- Workflow: `Windows Desktop Artifact`
- File: `.github/workflows/windows-desktop-artifact.yml`
- Branch: `main`
- Artifact name: `RealmsOfWar-windows-unsigned`

The workflow builds the Tauri app on `windows-latest` and uploads:

```text
src-tauri/target/release/*.exe
src-tauri/target/release/bundle/nsis/*.exe
```

Do not commit generated executable or installer artifacts to the repository.
Download artifacts to a directory outside the checkout, for example:

```text
C:\Users\<you>\Documents\STR\realms-of-war-artifacts\<run-id>
```

GitHub Actions artifacts can expire. Attach smoke-tested binaries to a clearly
marked unsigned pre-release when a handoff must remain available after artifact
retention expires.

## Expected Artifact Contents

The extracted artifact should contain:

```text
realms-of-war.exe
bundle\nsis\Realms of War_0.2.0_x64-setup.exe
```

`realms-of-war.exe` is the quickest portable smoke target. The NSIS setup file
is the installer/uninstaller smoke target.

The `v0.2.0-unsigned-playtest.7` handoff was smoke-checked locally by launching
the portable executable and by installing, launching, and uninstalling the NSIS
installer from a temporary directory outside the repository.

## Unsigned Warning

The installer and executable are unsigned. Windows SmartScreen or antivirus
software may warn that the publisher is unknown. That warning is expected for the
current playtest artifact and should be called out in any handoff.

Only run artifacts downloaded from the official repository Actions run.

## Portable Smoke

1. Extract the `RealmsOfWar-windows-unsigned` artifact.
2. Run:

```text
realms-of-war.exe
```

3. Verify a native `Realms of War` window opens.
4. Verify the main menu renders.
5. Click `New game`.
6. Keep the default setup and click `Start game`.
7. Verify the gameplay map renders nonblank with the desktop HUD.
8. Click the save action and verify a saved notification appears.
9. Verify a save file exists under:

```text
%APPDATA%\com.realmsofwar.game\saves
```

## Installer Smoke

Interactive path:

1. Run:

```text
bundle\nsis\Realms of War_0.2.0_x64-setup.exe
```

2. Accept the unsigned-publisher warning if shown.
3. Install Realms of War.
4. Launch the installed app.
5. Start a new game and save once.
6. Verify saves are written under:

```text
%APPDATA%\com.realmsofwar.game\saves
```

7. Uninstall through Windows Settings:

```text
Settings -> Apps -> Installed apps -> Realms of War -> Uninstall
```

Silent temp-directory smoke path:

```powershell
$installDir = "$env:TEMP\realms-of-war-installer-smoke"
& ".\bundle\nsis\Realms of War_0.2.0_x64-setup.exe" /S "/D=$installDir"
& "$installDir\realms-of-war.exe"
& "$installDir\uninstall.exe" /S
```

The `/D=...` argument must be the final installer argument for NSIS.

Uninstalling removes the installed app files. It may leave user save data under
`%APPDATA%\com.realmsofwar.game`; remove that directory manually when a clean
playtest profile is required.

## Local-First Expectations

The Windows desktop artifact should not require a VPS, public server, or local
HTTP server for core gameplay. New game, render, save, list, load, and delete
must work through the desktop static renderer and Tauri filesystem save path.

The only network requirement for this playtest is downloading the artifact from
GitHub Actions.

## Current Limitations

- No code signing yet.
- No updater yet.
- Placeholder branding may still appear in installer metadata or icons.
- Online multiplayer, cloud saves, accounts, payments, and production release
  signing are out of scope for this artifact.
