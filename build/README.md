# Build assets

This folder must contain icon assets before generating release installers.

## Required files (place manually)

- icon.ico       — 256×256 Windows icon
- icon.icns      — macOS icon set
- icons/         — Linux PNG set (16, 32, 48, 64, 128, 256, 512)
- installer.ico  — NSIS installer icon (256×256)
- uninstaller.ico — NSIS uninstaller icon

You can generate all of these from a single 1024×1024 source PNG using
`electron-icon-maker` or similar tools.

## License

`LICENSE.pt-BR.txt` is shown during NSIS install.

## Entitlements

`entitlements.mac.plist` is referenced from electron-builder.yml for
macOS hardened runtime.
