# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VRIME is an online Chinese input method editor (IME) designed for VR devices (Meta Quest), built on top of My RIME and librime. It's a static PWA that runs entirely in the browser using WebAssembly, with all computation performed client-side.

**Technology Stack:**
- Vue 3 + TypeScript
- Vite for build tooling
- RIME input engine compiled to WebAssembly
- Naive UI component library
- Simple Keyboard for on-screen keyboard

## Build Commands

### Initial Setup
```sh
# Install dependencies
pnpm i

# Get submodules (don't clone recursively - many boost libs not needed)
pnpm run submodule

# Download fonts (遍黑体, 花园明朝, 一点明朝 for uncommon characters)
pnpm run font
```

### Building Native and WASM Components
```sh
# Build native rime_api_console (for schema generation)
pnpm run native

# Install/generate schemas from GitHub
pnpm run schema

# Build all WASM libraries (yaml-cpp, leveldb, marisa, opencc, glog, rime)
pnpm run lib

# Build individual libraries (if needed)
pnpm run lib:yaml-cpp
pnpm run lib:leveldb
pnpm run lib:marisa
pnpm run lib:opencc
pnpm run lib:glog
pnpm run lib:rime

# Build rime.js, rime.wasm, rime.data
pnpm run wasm
```

**Environment variables for WASM build:**
- `ENABLE_LOGGING=OFF` (optional, default ON)
- `BUILD_TYPE=Debug` (optional, default Release)

### Development
```sh
# Run dev server (accessible at http://localhost:5173)
pnpm run dev

# Debug mode: http://localhost:5173/?debug=on
# Allows sending raw key sequences like {Shift+Delete}, {Release+a}

# Compile worker.ts to worker.js (auto-triggered on file changes in dev)
pnpm run worker
```

### Code Quality
```sh
# Lint TypeScript/Vue and C++ code
pnpm run lint
pnpm run lint:fix

# Type checking
pnpm run check
```

### Testing
```sh
# Run all tests (all browsers)
pnpm run test

# Run tests on specific browsers
pnpm run test:chromium
pnpm run test:firefox
pnpm run test:webkit
```

### Build & Preview
```sh
# Production build
pnpm run build

# Preview production build (accessible at http://localhost:4173)
pnpm run preview
```

## Architecture

### Threading Model
- **Main Thread**: UI components (Vue) + workerAPI.ts
- **Worker Thread**: worker.ts + rime.wasm (librime engine)
- Communication via `@libreservice/my-worker` library

### Key Components

**Main Thread:**
- `src/main.ts`: Entry point
- `src/App.vue`: Root component
- `src/router.ts`: Vue Router configuration (single route)
- `src/workerAPI.ts`: API wrapper for communicating with worker thread
- `src/components/`: Vue components (SimpleKeyboard, T9Keyboard, MyPanel, etc.)

**Worker Thread:**
- `src/worker.ts`: WebAssembly interface, schema loading, IndexedDB persistence
  - Uses IDBFS to mount `/rime` user directory to IndexedDB
  - Lazy-loads prebuilt schemas on demand from CDN or local `public/ime/`
  - Exposes: `setIME()`, `process()`, `deploy()`, `setOption()`, `selectCandidateOnCurrentPage()`, `changePage()`

**WASM Interface:**
- `wasm/api.cpp`: C++ bridge between JavaScript and librime
  - Converts librime C structs to JSON strings
  - Handles RIME notifications (option updates, schema changes, deploy status)
  - Key functions: `process()`, `set_ime()`, `deploy()`, `select_candidate_on_current_page()`

**Build System:**
- `scripts/build_lib.ts`: Builds WASM libraries with emscripten (cmake + ninja)
- `scripts/build_wasm.ts`: Compiles api.cpp + librime.a → rime.js/wasm/data
- `scripts/build_native.ts`: Builds native rime_api_console
- `scripts/install_schemas.ts`: Downloads and compiles RIME schemas
- `rollup.worker-config.js`: Bundles worker.ts → worker.js

### Schema Loading Strategy

**Before deployment (`deployed = false`):**
- Uses prebuilt binary schemas (`.table.bin`, `.prism.bin`, `.reverse.bin`)
- Lazy-loaded from CDN or `public/ime/{target}/` on demand
- Schema metadata in `schema-name.json`, `schema-files.json`, `schema-target.json`

**After deployment (`deployed = true`):**
- RIME engine compiles schemas from YAML files
- User can deploy custom schemas via UI

### File System Layout
- `/rime`: User data directory (mounted to IndexedDB via IDBFS)
- `/usr/share/rime-data`: Shared data directory (prebuilt schemas)
- `/usr/share/rime-data/build/`: Binary schema files

## Important Constraints

- **Submodule handling**: Don't clone recursively; many boost libs are unnecessary
- **Platform-specific**: emsdk required for WASM builds
- **Native dependencies**: cmake, ninja, clang-format required (see README for OS-specific packages)
- **Worker compilation**: Auto-triggered in dev mode when watching `worker.ts` or schema JSON files
- **C++ formatting**: Use `clang-format` for `wasm/api.cpp`
- **TypeScript**: Strict mode enabled; use `vue-tsc` for type checking

## Special Features

- **T9 Input**: Nine-key keyboard implementation (in progress, see roadmap)
- **Voice Recognition**: Sherpa-ONNX integration for speech input
- **Layout Switching**: Auto-switches keyboard layout based on window size
- **Schema Selection**: 30+ Chinese input schemas (Pinyin, Cantonese, Wubi, Bopomofo, etc.)
- **PWA**: Installable, offline-capable progressive web app

## Git Workflow

- Main branch: `master`
- Current feature branch: `feat/t9-input`
- Submodules: `librime`, `librime-lua`, `lua`, `boost`
- Modified submodule: `librime` has custom patches applied during build

## Testing Notes

- Playwright tests cover various input schemas (test/*.spec.ts)
- Test device-specific behavior in test-device/
- Tests run against preview server (port 4173)
- 3 retries configured for flaky tests
