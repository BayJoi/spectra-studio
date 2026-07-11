<div align="center">

# Spectra Studio

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

## Credits & Inspiration

This project would not exist without these:

| | Name | Link |
|---|------|------|
| :sparkles: | **VoidMesh** — the original inspiration for this project | [GitHub](https://github.com/ogdakke/voidmesh) |
| :art: | **Radiant Shaders** — landing page background shaders (MIT, Paul Bakaus) | [radiant-shaders.com](https://radiant-shaders.com/) / [GitHub](https://github.com/pbakaus/radiant) |
| :font: | **JetBrains Mono** — monospace font used throughout | [jetbrains.com](https://www.jetbrains.com/lmono/) |
| :font: | **Instrument Serif** — serif font for the landing page | [Google Fonts](https://fonts.google.com/specimen/Instrument+Serif) |
| :icon: | **Lucide** — icon set | [lucide.dev](https://lucide.dev/) |
| :robot: | **Built with AI** — every file, every shader, every component was generated through conversations with AI. I am not a developer and I do not know how to code. |

---

## About

Spectra Studio is a client-side image processing tool that applies real-time GPU shaders to images directly in your browser. Every effect runs on your graphics card through raw WebGL2 — nothing leaves your machine.

This project was created by someone with no programming background, using AI as the primary development tool. I found [VoidMesh](https://github.com/ogdakke/voidmesh) and wanted to build something like it that runs in the browser — so I did, using AI as the only tool.

The entire application runs in the browser. There is no backend, no Electron wrapper, no WebAssembly, and no server-side processing. Your images never leave your device.

---

## Features

### 16 GPU-Accelerated Effects

| Effect | Category | Animated |
|--------|----------|----------|
| Noise | Basic | - |
| Pixelate | Retro | - |
| Glitch | Distortion | - |
| Halftone | Stylized | - |
| ASCII | Retro | - |
| CRT Screen | Retro | - |
| Chromatic Aberration | Distortion | - |
| Outline | Stylized | - |
| Radial Blur | Distortion | - |
| Holo Glitch | Distortion | Yes |
| Fluid | Distortion | Yes |
| Kaleidoscope | Stylized | - |
| Halftone (Beta) | Stylized | - |
| Halftone (Beta 2) | Stylized | - |
| Bloom | Stylized | - |
| LED / Dot Matrix | Retro | - |

### Core Capabilities

- **Real-time rendering** — All effects process at 60fps via a ping-pong framebuffer pipeline
- **Multi-pass shaders** — Bloom uses a 4-pass pipeline (brightpass, horizontal blur, vertical blur, combine)
- **Custom presets** — Save, load, and delete your own filter combinations
- **Undo / Redo** — Full history stack for filter additions, removals, and parameter changes
- **Export** — Save as PNG, JPEG, or WebP
- **Before / After comparison** — Split-view slider to compare original and processed images
- **Drag-and-drop** — Drop images directly onto the editor
- **Zoom & Pan** — Mouse wheel zoom with click-and-drag panning
- **GPU texture capping** — Automatically downscales images exceeding GPU limits
- **Context loss recovery** — Gracefully handles WebGL context loss and restoration
- **Zero dependencies on external GPU libraries** — Pure WebGL2, no Three.js, no Pixi.js

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Remove selected filter |
| `C` | Toggle before/after comparison |
| `D` | Toggle all effects on/off |
| `E` | Open effects browser |
| `P` | Toggle preset dropdown |
| `L` | Toggle lock on selected effect |
| `Ctrl+L` | Lock/unlock all effects |
| `Escape` | Close dropdown menus |

### Custom Presets

Presets are saved to `localStorage` under the key `spectra-custom-presets`. Each preset stores filter types, order, parameter values, and enabled/disabled state.

To save a preset: configure your filters, click the preset dropdown in the bottom panel, and select "Save Current".

---

## Getting Started

### Windows (easiest)

1. Install [Bun](https://bun.sh)
2. Clone the repo and open the folder:
   ```
   git clone https://github.com/your-username/spectra-studio.git
   cd spectra-studio
   ```
3. Double-click `setup.bat` — this installs everything and builds the app
4. Double-click `start.bat` — the app opens in your browser at `http://localhost:5173`

That's it.

### Mac / Linux

1. Install [Bun](https://bun.sh)
2. Clone the repo:
   ```
   git clone https://github.com/your-username/spectra-studio.git
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

## Production Build

If you want to build the app for deployment (hosting on a server, Netlify, Vercel, etc.):

**Windows:** Double-click `build.bat`

**Mac / Linux:**
```
bun run build
```

Output is written to the `dist/` directory. To preview it locally:
```
bun run preview
```

---

## Development

If you're modifying the code and want the app to auto-reload when you save changes:

**Windows:** Double-click `scripts\dev.bat`

**Mac / Linux:**
```
bun run dev
```

This starts the Vite dev server with hot reload. The app updates instantly when you edit any file.

---

## Windows Batch Scripts

All `.bat` files are in the project root. Double-click to run.

| Script | What it does |
|--------|-------------|
| `start.bat` | Start the app |
| `setup.bat` | Install + build (first time setup) |
| `build.bat` | Build for production |
| `reinstall.bat` | Nuke everything and start fresh |
| `cleanup.bat` | Delete temp files (node_modules, dist, cache) |

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
  App.tsx                    # Root app, lazy-loaded editor, splash management
  main.tsx                   # Entry point
  index.css                  # Global styles, animations, keyframes
  env.d.ts                   # TypeScript declarations

  components/
    LandingPage.tsx          # Landing page with background shaders
    EditorLayout.tsx         # Editor shell (header, keyboard shortcuts, export)
    CanvasArea.tsx           # Canvas, WebGL engine mount, RAF loop, zoom/pan
    BottomPanel.tsx          # Filter list, parameter sliders, presets, drag reorder
    ErrorBoundary.tsx        # React error boundary

  gl/
    engine.ts                # EffectEngine — render loop, RT pool, draw calls
    shader-library.ts        # Shader compilation, caching, progressive prewarm
    webgl-utils.ts           # WebGL helpers (texture creation, quad geometry)
    fontAtlas.ts             # Font atlas generation for ASCII filter

  shaders/
    vertex.glsl              # Shared vertex shader
    passthrough.glsl         # Passthrough fragment shader
    header.glsl              # Shared GLSL header (noise functions, math)
    *.glsl                   # Individual effect fragment shaders

  filters/
    filter-registry.ts       # Filter manifests (params, uniforms, categories)

  store/
    atoms.ts                 # Jotai atoms (filters, selection, history, presets)

  utils/
    grain.ts                 # Film grain overlay
    rain-on-glass.ts         # Landing page shader
    digital-rain.ts          # Landing page shader
    hologram-glitch.ts       # Landing page shader
    sequin-wave.ts           # Landing page shader
```

### Rendering Pipeline

1. Source image is uploaded to a WebGL texture
2. Filters are applied in reverse order through a ping-pong framebuffer pair (targetA ↔ targetB)
3. Each filter reads from one buffer, writes to the other
4. Multi-pass filters (Bloom) allocate additional render targets from a pool
5. The final result is drawn to the screen canvas
6. The RAF loop runs only when animated filters are active or state changes — otherwise it stops completely

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
- No accessibility features (screen reader support, keyboard navigation for all controls)
- No automated test suite — testing was done manually on my personal machine

---

## License

This project is open source under the [GNU General Public License v3.0](LICENSE).

See [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt) for all dependency and asset licenses.

---

<div align="center">

*Built with curiosity. Powered by WebGL2. Made possible by AI. Made by someone who doesn't know how to code.*

</div>
