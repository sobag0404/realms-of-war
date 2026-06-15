# Local Save Recovery

This document defines the local-first save recovery boundary for the Windows PC
desktop path and the static browser fallback. It does not add cloud saves,
accounts, signing, an updater, or a required server.

## Scope

- Core gameplay saves must work without a server or VPS.
- The desktop runtime stores saves through Tauri filesystem commands.
- Static browser builds use IndexedDB and fall back to localStorage when
  IndexedDB cannot open.
- `ServerSaveRepository` remains a development/web compatibility adapter only.

## Versions

- Engine save payloads use `SaveFile.version` from
  `src/engine/save/migrations.ts`.
- Repository records use storage metadata:
  - desktop records use `storageVersion: 1`;
  - browser records are currently storage-versionless but share the same
    summary and health fields.
- Older engine save payloads should migrate through `deserializeSave()`.
- Future engine save versions are reported as `unsupported`, not loaded.
- Future desktop storage versions are reported as `unsupported`, not loaded or
  silently rewritten.

## Desktop Files

Windows desktop saves are stored under:

```text
%APPDATA%\com.realmsofwar.game\saves
```

Each save slot is a JSON record containing summary metadata, serialized
`SaveFile` data, checksum, and optional embedded backup data. Tauri writes via a
temporary `*.json.tmp` path and keeps a sidecar `*.json.bak` copy next to the
primary `*.json` save file.

On delete, the primary `*.json`, sidecar `*.json.bak`, and temporary
`*.json.tmp` paths for that save id are removed.

## Browser Storage

Browser/static saves prefer IndexedDB. If IndexedDB is unavailable or cannot
open, saves fall back to localStorage. Browser records keep the latest good save
payload as embedded backup metadata so a damaged primary payload can still be
listed and recovered.

## Health States

Save summaries may include:

- `available`: primary data and checksum are valid.
- `recoverable`: primary data is damaged, but a valid backup payload is
  available.
- `corrupt`: the save cannot be parsed or its checksum/data cannot be trusted.
- `unsupported`: the save was created by a newer format/storage version than
  this build supports.

The load menu must not break when one save is corrupt or unsupported. It should
show the affected entry, disable normal load for unrecoverable entries, keep
delete available, and label recoverable entries clearly.

## Player Recovery Behavior

- `available` saves load normally.
- `recoverable` saves load from the backup copy and keep a user-facing recovery
  message.
- `corrupt` saves remain visible so the player can delete them from the menu.
- `unsupported` saves remain visible but require a newer compatible game build.

Manual file editing is not part of the supported recovery flow.

## Test Coverage

Current coverage includes:

- engine save validation for malformed, future-version, corrupt JSON, and
  oversized input;
- browser local save recovery, unrecoverable corruption, IndexedDB fallback, and
  oversized-save rejection;
- Tauri filesystem adapter recovery, future storage version handling, read
  failure wrapping, and oversized-save rejection before filesystem writes;
- server adapter list/load response validation and checksum mismatch handling.
