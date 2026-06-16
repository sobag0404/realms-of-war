# Windows Artifact Smoke

Date: 2026-06-15

Status: reusable smoke checklist for the unsigned Windows desktop playtest
artifact. Player-facing download and uninstall steps live in
[`download/README.md`](../download/README.md).

## Artifact Source

Current handoff:

- Release:
  <https://github.com/sobag0404/realms-of-war/releases/tag/v0.2.0-unsigned-playtest.5>
- Commit: `f226a0934ccfa913ae6e6d725d0c7c268e86c18c`
- Main CI: <https://github.com/sobag0404/realms-of-war/actions/runs/27577166263>
- Windows artifact workflow:
  <https://github.com/sobag0404/realms-of-war/actions/runs/27577372571>
- Local inspection path:
  `C:\Users\pcia0\Documents\STR\realms-of-war-artifacts\main-f226a09-run-27577372571`

Current release checksums:

```text
C03EBEBA1ECDD44619B6E2938A0B125FCE473066239238CEDDE5EA8FA297F623  realms-of-war.exe
8AB3BD57D85E21B3A7F47FC7BFAAB38DC691F70009A2AC035AC12BE8F9A567C7  RealmsOfWar-0.2.0-windows-x64-setup.exe
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

The `v0.2.0-unsigned-playtest.5` handoff was smoke-checked locally by launching
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
