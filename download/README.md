# Realms of War Windows Playtest

This playtest uses an unsigned Windows desktop artifact built by GitHub Actions.
It is local-first: after download and installation, core gameplay does not need a
server, VPS, or network connection.

## Download

Preferred current handoff:

- Release:
  <https://github.com/sobag0404/realms-of-war/releases/tag/v0.2.0-unsigned-playtest.1>
- Source commit: `9b91ee2f94d030c1b19efdc230009023bc96fe5b`
- Main CI:
  <https://github.com/sobag0404/realms-of-war/actions/runs/27562768897>
- Windows artifact workflow:
  <https://github.com/sobag0404/realms-of-war/actions/runs/27562792300>

Release assets:

```text
realms-of-war.exe
RealmsOfWar-0.2.0-windows-x64-setup.exe
SHA256SUMS.txt
```

SHA256:

```text
B30E798F7D2968E5524A2F8FAB630CCB7F614D48B8A2EB9B4EA0120D381D33FD  realms-of-war.exe
E0B451961CE40B1850C77B579946931F05FF55C923A16464EBEC27CA4B335C26  RealmsOfWar-0.2.0-windows-x64-setup.exe
```

Fallback Actions artifact path:

1. Open the repository Actions page:
   <https://github.com/sobag0404/realms-of-war/actions>
2. Open the latest successful `Windows Desktop Artifact` run from the `main`
   branch.
3. Download the `RealmsOfWar-windows-unsigned` artifact.
4. Extract the downloaded `.zip` to a normal user folder, for example
   `Downloads\RealmsOfWar-windows-unsigned`.

GitHub may require you to be signed in before artifact downloads are visible.
GitHub Actions artifacts are temporary and may expire or be removed according to
the repository retention settings. If `RealmsOfWar-windows-unsigned` is missing,
use the pre-release assets above or ask the maintainer to rerun the `Windows
Desktop Artifact` workflow.

## Run Without Installing

For the quickest playtest, run the portable executable from the extracted
artifact:

```text
realms-of-war.exe
```

The app should open a `Realms of War` desktop window. From the main menu, choose
`New game`, keep the default setup, and start the game.

The portable executable is unsigned. Windows SmartScreen or antivirus software
may show an unknown publisher warning.

SmartScreen may show `Windows protected your PC`. If you choose to proceed,
select `More info`, then `Run anyway`, only after confirming the file came from
the official release or GitHub Actions run above.

## Install

The release includes an NSIS installer:

```text
RealmsOfWar-0.2.0-windows-x64-setup.exe
```

If you are using the extracted GitHub Actions artifact instead of the release,
the installer is nested under:

```text
bundle\nsis\Realms of War_0.2.0_x64-setup.exe
```

Double-click the setup file, follow the installer prompts, then launch Realms of
War from the Start menu, installer finish screen, or installation directory.

This installer is unsigned too. Windows SmartScreen or antivirus software may
show an unknown publisher warning. That is expected for the current development
playtest. Only continue if the file came from the official release or GitHub
Actions run above.

The installer does not install or start a local server. It installs the Tauri
desktop app only.

## Saves

The Windows desktop app writes saves under:

```text
%APPDATA%\com.realmsofwar.game\saves
```

Each save is stored as a local JSON file. These saves are not uploaded to a
server.

Builds with local save recovery enabled keep a backup copy next to the primary
desktop save file. If the load menu shows `Backup available`, use `Recover` to
load the backup copy. Corrupt or unsupported saves stay visible in the load menu
so you can delete them; unsupported saves require a newer compatible game build.

## Portable Cleanup

If you used the portable executable, there is no Windows uninstall entry. Close
the app and delete the extracted `RealmsOfWar-windows-unsigned` folder or the
downloaded `realms-of-war.exe`. Remove `%APPDATA%\com.realmsofwar.game` only if
you also want to delete local saves.

## Uninstall

Use Windows Settings:

```text
Settings -> Apps -> Installed apps -> Realms of War -> Uninstall
```

Or run `uninstall.exe` from the installation directory.

Uninstalling removes the installed app files. To delete local playtest saves as
well, remove:

```text
%APPDATA%\com.realmsofwar.game
```

## Current Limitations

- The handoff is Windows-only.
- The artifact is unsigned and is not a production release.
- SmartScreen warnings are expected until code signing is added.
- There is no updater.
- GitHub Actions artifacts can expire. Use the pre-release assets for the
  durable current playtest handoff.
- Online multiplayer, cloud saves, and account login are out of scope for this
  playtest.
