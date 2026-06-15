# Realms of War Windows Playtest

This playtest uses an unsigned Windows desktop artifact built by GitHub Actions.
It is local-first: after download and installation, core gameplay does not need a
server, VPS, or network connection.

## Download

1. Open the repository Actions page:
   <https://github.com/sobag0404/realms-of-war/actions>
2. Open the latest successful `Windows Desktop Artifact` run from the `main`
   branch.
3. Download the `RealmsOfWar-windows-unsigned` artifact.
4. Extract the downloaded `.zip` to a normal user folder, for example
   `Downloads\RealmsOfWar-windows-unsigned`.

GitHub may require you to be signed in before artifact downloads are visible.

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

## Install

The artifact also includes an NSIS installer:

```text
bundle\nsis\Realms of War_0.2.0_x64-setup.exe
```

This installer is unsigned too. Windows SmartScreen or antivirus software may
show an unknown publisher warning. That is expected for the current development
playtest. Only continue if the file came from the official GitHub Actions run
above.

The installer does not install or start a local server. It installs the Tauri
desktop app only.

## Saves

The Windows desktop app writes saves under:

```text
%APPDATA%\com.realmsofwar.game\saves
```

Each save is stored as a local JSON file. These saves are not uploaded to a
server.

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

- The artifact is unsigned and is not a production release.
- SmartScreen warnings are expected until code signing is added.
- There is no updater.
- Online multiplayer, cloud saves, and account login are out of scope for this
  playtest.
