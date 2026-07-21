<div align="center">

# Spectra Studio

<img width="1920" height="1040" alt="zen_nfVDgKsFfz" src="https://github.com/user-attachments/assets/e44bee14-554e-462d-b6a3-e1fff23b0cbb" />

**A browser-based GPU image effects editor built entirely with WebGL2.**

No server. No upload. No accounts. No internet required. Just you and your GPU.

[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)](#license)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![WebGL2](https://img.shields.io/badge/WebGL2-2.0-green.svg)](https://www.khronos.org/webgl/)
[![Bun](https://img.shields.io/badge/Bun-runtime-f472b6.svg)](https://bun.sh)

</div>

---

> [!IMPORTANT]
> **This project might not be stable.** The code might be messy, there will be bugs, and things might break. I am not a developer — I do not know how to code. I built this entirely using AI for my own needs after I found out about [VoidMesh](https://github.com/ogdakke/voidmesh) and wanted something similar. This project is heavily inspired by that.
>
> I built it for fun and for my own needs. That is all. I will try to add more effects and features in the future. And you can customise this completely yourself — it is fully open source, fork it, break it, make it yours.
>
> Sorry, and thank you for checking it out.

---

## About

Spectra Studio is a client-side image processing tool that applies real-time GPU shaders to images directly in your browser. Every effect runs on your graphics card through raw WebGL2 — nothing leaves your machine.

The entire application runs in the browser. There is no backend, no Electron wrapper, no WebAssembly, and no server-side processing. Your images never leave your device.

---

## Features

### 16 GPU-Accelerated Effects

| Effect | Category |
|--------|----------|
| Noise | Basic |
| Pixelate | Retro |
| Glitch | Distortion |
| Halftone | Stylized |
| ASCII | Retro |
| CRT Screen | Retro |
| Chromatic Aberration | Distortion |
| Outline | Stylized |
| Radial Blur | Distortion |
| Holo Glitch | Distortion |
| Fluid | Distortion |
| Kaleidoscope | Stylized |
| Halftone (Beta) | Stylized |
| Halftone (Beta 2) | Stylized |
| Bloom | Stylized |
| LED / Dot Matrix | Retro |

### Core Capabilities

- **Real-time rendering** — All effects process at 60fps via a ping-pong framebuffer pipeline
- **Render scale** — Reduce canvas resolution (25%, 50%, 100%) for performance while maintaining effect quality
- **Multi-pass shaders** — Bloom uses a 4-pass pipeline (brightpass, horizontal blur, vertical blur, combine)
- **Custom presets** — Save, load, and delete your own filter combinations to `localStorage`
- **Undo / Redo** — Full history stack (30 states) for filter additions, removals, and parameter changes
- **Export** — Save as PNG, JPEG, or WebP with configurable quality. Exports always render at full resolution regardless of render scale
- **Before / After comparison** — Split-view slider with auto-track on activation and keyboard nudge
- **Clipboard paste** — Paste images directly with `Ctrl+V`
- **Auto-save** — Optional auto-save to restore your session after a refresh
- **Drag-and-drop** — Drop images directly onto the editor
- **Zoom & Pan** — Mouse wheel zoom with click-and-drag panning
- **GPU texture capping** — Automatically downscales images exceeding GPU limits
- **Context loss recovery** — Gracefully handles WebGL context loss and restoration
- **Background shaders** — Landing page features 4 animated background shaders from [Radiant Shaders](https://radiant-shaders.com/)
- **Duplicate filter** — Clone any filter with all parameters intact
- **Randomize parameters** — Generate random values for any filter with one click
- **Filter descriptions** — Each effect includes a description explaining what it does
- **Zero external GPU dependencies** — Pure WebGL2, no Three.js, no Pixi.js

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+V` | Paste image from clipboard |
| `Delete` / `Backspace` | Remove selected filter |
| `C` | Toggle before/after comparison |
| `D` | Toggle all effects on/off |
| `E` | Open effects browser |
| `P` | Open preset browser |
| `L` | Lock/unlock selected effect |
| `Ctrl+L` | Lock/unlock all effects |
| `R` | Cycle render scale (25% → 50% → 100%) |
| `Shift+←` / `Shift+→` | Nudge compare split left/right |
| `Escape` | Close dropdown menus |

---

## Getting Started

### Windows (easiest)

1. Install [Bun](https://bun.sh)
2. Clone the repo and open the folder:

   ```
   git clone https://github.com/BayJoi/spectra-studio.git
   cd spectra-studio
   ```

3. Double-click `setup.bat` — this installs everything
4. Double-click `start.bat` — the app opens in your browser at `http://localhost:5173`

That's it.

### Mac / Linux

1. Install [Bun](https://bun.sh)
2. Clone the repo:

   ```
   git clone https://github.com/BayJoi/spectra-studio.git
   cd spectra-studio
   ```
   
3. Install dependencies:

   ```
   bun install
   ```
   
4. Start the app:

   ```
   bun run dev
   ```
   
5. Open `http://localhost:5173` in your browser


---

## Windows Batch Scripts

All `.bat` files are in the project root. Double-click to run.

| Script | What it does |
|--------|-------------|
| `start.bat` | Start the app |
| `setup.bat` | Install (first time setup) |
| `reinstall.bat` | Nuke everything and start fresh |
| `cleanup.bat` | Delete temp files (node_modules, cache) |

**Developer scripts** in the `scripts/` folder:

| Script | What it does |
|--------|-------------|
| `scripts\dev.bat` | Start dev server with hot reload |
| `scripts\check.bat` | Run all checks (typecheck + lint + build) |
| `scripts\lint.bat` | Lint only |
| `scripts\typecheck.bat` | Typecheck only |
| `scripts\build.bat` | Production build with checks |
| `scripts\preview.bat` | Build and preview |
| `scripts\clean-dev.bat` | Clear cache and start dev |
| `scripts\clean-install.bat` | Full clean reinstall |
| `scripts\analyze.bat` | Build and show bundle sizes |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript |
| Build Tool | Vite 7 |
| Runtime | Bun |
| State Management | Jotai (atomic atoms) |
| GPU API | Raw WebGL2 |
| Styling | UnoCSS (Tailwind-compatible) |
| Icons | `@iconify-json/lucide` via `@unocss/preset-icons` |
| Fonts | JetBrains Mono, Instrument Serif |
| Linting | ESLint (typescript-eslint, react-hooks, react-refresh) |

---

## Architecture

```
src/
  App.tsx                         # Root app, lazy-loaded editor, splash management
  main.tsx                        # Entry point
  constants.ts                    # ASCII ramp, export formats, render scales
  index.css                       # Global styles, animations, keyframes
  env.d.ts                        # TypeScript declarations for GLSL imports

   components/
     LandingPage.tsx               # Landing page with background shaders
     EditorLayout.tsx              # Editor shell (header, export, drag-and-drop)
     CanvasArea.tsx                # Canvas, WebGL engine mount, RAF loop, zoom/pan
     BottomPanel.tsx               # Filter list, drag reorder, image upload
     ErrorBoundary.tsx             # React error boundary
     Toast.tsx                     # Toast notification system
     canvas/
       ZoomControls.tsx            # Zoom in/out/reset overlay
     filter-panel/
      EffectBrowser.tsx           # Searchable effect dropdown
      FilterCard.tsx              # Individual filter card with sliders
      PresetBrowser.tsx           # Save/load/delete custom presets

  gl/
    engine.ts                     # EffectEngine — render loop, RT pool, draw calls
    shader-library.ts             # Shader compilation, caching, progressive prewarm
    webgl-utils.ts                # WebGL helpers (texture creation, quad geometry)
    fontAtlas.ts                  # Font atlas generation for ASCII filter

  shaders/
    vertex.glsl                   # Shared vertex shader
    passthrough.glsl              # Passthrough fragment shader
    header.glsl                   # Shared GLSL header (noise functions, math)
    *.glsl                        # Individual effect fragment shaders

  filters/
    filter-registry.ts            # Filter manifests (params, uniforms, categories)

  store/
    atoms.ts                      # Central export barrel for all atoms
    types.ts                      # FilterData, FilterType, CustomPreset, uuid
    core-atoms.ts                 # Base atoms (filters, selection, history, imageUrl)
    filter-actions.ts             # Add/remove/toggle/reorder/lock filters
    history.ts                    # Undo/redo atoms
    presets.ts                    # Custom preset save/load/delete
    export-atoms.ts               # Export trigger, format, file handle
    ui-atoms.ts                   # Effect browser, preset browser, render scale
    reset.ts                      # Full editor reset
    url-hash.ts                   # Encode/decode filter state to URL hash

  hooks/
    useEditorKeyboardShortcuts.ts # All keyboard shortcut handlers
    useAutoSave.ts                # Session auto-save / restore (store-level subscription)
    useExport.ts                  # Export orchestration (save picker, concurrency guard)
    useCanvasExport.ts            # Export execution on the WebGL engine

  utils/
    grain.ts                      # Film grain overlay
    rain-on-glass.ts              # Landing page background shader
    digital-rain.ts               # Landing page background shader
    hologram-glitch.ts            # Landing page background shader
    sequin-wave.ts                # Landing page background shader
```

### Rendering Pipeline

1. Source image is uploaded to a WebGL texture
2. Filters are applied in reverse order through a ping-pong framebuffer pair (targetA ↔ targetB)
3. Each filter reads from one buffer, writes to the other
4. Multi-pass filters (Bloom) allocate additional render targets from a pool
5. When render scale < 100%, effects render to an intermediate target at reduced resolution, then upscale to the canvas
6. The final result is drawn to the screen canvas
7. The RAF loop runs only when animated filters are active or state changes — otherwise it stops completely

### Shader Compilation

- All `.glsl` files are imported eagerly at build time via `vite-plugin-glsl`
- On engine creation, `prewarm()` compiles shaders progressively in batches of 3 using `requestIdleCallback`
- The editor opens immediately — shaders compile in the background
- First frames use a passthrough shader until compilation completes
- If `KHR_parallel_shader_compile` is available, shader linking is deferred

---

## Browser Compatibility

Spectra Studio requires WebGL2. It works in:

- Chrome 56+
- Edge 79+
- Firefox 51+
- Safari 15+

Features like `KHR_parallel_shader_compile` are used when available but are not required. The app degrades gracefully on older hardware.

**Tested on:** Zen Browser (Firefox-based) and Brave Browser (Chromium-based) on Windows 10.

---

## Known Limitations

- Tested on Windows 10 with Zen Browser (Firefox) and Brave Browser (Chromium) — other OS and browser combinations are unverified
- Not tested on integrated graphics, older discrete GPUs, or mobile devices
- Limited accessibility — ARIA labels, focus styles, and screen-reader announcements exist for most controls, but full keyboard navigation (e.g. moving between filter cards) is not implemented
- No automated test suite — testing was done manually

---

## Credits & Inspiration

| | Name | Link |
|---|------|------|
| | **VoidMesh** — the original inspiration for this project | [GitHub](https://github.com/ogdakke/voidmesh) |
| | **Radiant Shaders** — landing page background shaders (MIT, Paul Bakaus) | [radiant-shaders.com](https://radiant-shaders.com/) / [GitHub](https://github.com/pbakaus/radiant) |
| | **JetBrains Mono** — monospace font used throughout | [jetbrains.com](https://www.jetbrains.com/lmono/) |
| | **Instrument Serif** — serif font for the landing page | [Google Fonts](https://fonts.google.com/specimen/Instrument+Serif) |
| | **Lucide** — icon set | [lucide.dev](https://lucide.dev/) |

---

## License

This project is open source under the [GNU General Public License v3.0](LICENSE).

See [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt) for all dependency and asset licenses.

---

<div align="center">

*Built with curiosity. Powered by WebGL2. Made possible by AI. Made by someone who doesn't know how to code.*

</div>
