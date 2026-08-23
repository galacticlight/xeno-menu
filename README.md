# XenoMenu

**A live desktop application with an arts style and interface inspired by the 1998 *Xenogears* menu display.**

XenoMenu enhances your everyday desktop experience with a nostalgic yet practical system dashboard, quick launcher, and status panel that feels like stepping into the world of *Xenogears*.

## Features

- **Xenogears-inspired UI**  
  Dark ornate frames, gold/blue accents, red selection indicators, HP-style resource bars, and a classic command list layout.

- **Live System Status**  
  Real-time CPU, Memory, Storage, and Battery presented as “party members” with HP gauges (higher remaining = healthier system).

- **Keyboard-first navigation**  
  Arrow keys / WASD, number keys 1-7, Enter to confirm, Esc to hide — just like a classic JRPG menu.

- **Global hotkey**  
  `⌘⇧X` (macOS) or `Ctrl+Shift+X` (Windows) to toggle the menu instantly.

- **System tray integration**  
  Hide to tray, always-on-top toggle, quick quit.

- **Security-focused design**
  - Electron with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
  - Minimal IPC surface via `contextBridge`
  - Path sanitization against command injection
  - CSP in renderer
  - No remote content loading by default
  - Hardened runtime entitlements prepared for macOS

- **Cross-platform**  
  Primary target: **macOS** (Mac mini, Apple Silicon + Intel).  
  Secondary: **Windows 11**. Linux AppImage also buildable.

## Aesthetic Notes

The interface deliberately evokes the field/main menu of *Xenogears* (PlayStation, 1998):

- Semi-transparent dark panels with metallic/stone-like borders and corner ornaments
- Character-status style cards on the right
- Command list on the left with red cursor/selection
- Bottom bar showing “FREE” (disk space) and live “TIME”
- Pixel-friendly monospace typography

## Requirements

- Node.js 18+ (recommended 20+)
- macOS 12+ or Windows 10/11
- For building: Xcode Command Line Tools (macOS) or Visual Studio Build Tools (Windows)

## Quick Start (Development)

```bash
git clone https://github.com/galacticlight/xeno-menu.git
cd xeno-menu
npm install
npm start
```

Development with logging:

```bash
npm run dev
```

## Building

```bash
# macOS (DMG for arm64 + x64)
npm run build:mac

# Windows (NSIS installer)
npm run build:win

# All platforms (from the respective OS)
npm run build
```

Output appears in the `dist/` folder.

> **Note for macOS distribution**: For Gatekeeper-friendly builds you should code-sign and notarize. The project includes a hardened-runtime entitlements file under `build/entitlements.mac.plist`.

## Tests

Unit and regression tests for core logic (menu navigation, status shaping, path safety):

```bash
npm test
```

Coverage report is generated under `coverage/`.

## Security Notes

XenoMenu is designed with the principle of least privilege:

- Renderer has **no** direct Node.js access.
- Only a small, audited set of IPC channels is exposed.
- File/path operations are sanitized.
- No automatic network requests.
- Configuration is stored locally via `electron-store`.

If you discover a security issue, please open a private security advisory on the repository.

## Roadmap (ideas)

- [ ] Customizable “party” (pin any process or metric)
- [ ] Drag-and-drop favorites / Inventory
- [ ] Theme variants (classic, hyper mode, shevat, etc.)
- [ ] Optional sound effects (menu select, confirm)
- [ ] Native macOS menu bar extra / Windows system tray polish
- [ ] Script / skill bindings
- [ ] Multi-monitor awareness

## Disclaimer

*Xenogears* is a trademark of Square Enix. This project is an unofficial fan-inspired utility and is not affiliated with or endorsed by Square Enix.

## License

MIT © galacticlight

---

**Beyond the beginning… and the end.**  
Enjoy your enhanced desktop, traveler.
