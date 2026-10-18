# CamelKit Plugin Template

Welcome to the official starter template for creating plugins for the **CamelKit** client (for [EvilQuest](https://evilquest.net)).

This repository serves as a starter template and interactive reference showcasing how to hook into live game state, display custom UI in the sidebar, manage reactive settings, persist data per-character, and package assets for submission to the **CamelKit Plugin Hub**.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v22.0.0` or higher
- **Corepack / Yarn Modern**: (v4.9.1, configured via `packageManager`)

### 1. Create a Repository from this Template
Click **"Use this template"** on GitHub or clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/camelkit-my-plugin.git
cd camelkit-my-plugin
```

### 2. Install Dependencies
Enable Corepack and run install (Yarn 4.9.1 will be used automatically):
```bash
corepack enable
yarn install
```

### 3. Build the Plugin
```bash
# Build production bundle (outputs to dist/plugin.js)
yarn build

# Or run in watch mode during development
yarn dev

# Run TypeScript typechecks
yarn typecheck
```

---

## 📁 Project Structure

```
├── .github/
│   └── workflows/
│       └── build_and_release.yml # CI workflow verifying builds on push/PR
├── .editorconfig
├── .gitignore
├── .yarnrc.yml                   # Yarn Modern node-modules linker
├── package.json                  # Manifest & dependencies (resolves @camelkit/core via NPM)
├── yarn.lock                     # Strict Yarn 4 lockfile (required for CI builder)
├── tsconfig.json                 # TypeScript compiler configuration
├── build.mjs                     # esbuild bundle configuration producing dist/plugin.js
├── resources/                    # Bundled static resources (inlined as data URLs)
│   ├── css/
│   │   └── panel.css             # Scoped stylesheet for the plugin sidebar UI
│   ├── html/
│   │   └── panel.html            # HTML structure for the sidebar panel
│   ├── images/
│   │   └── icon.png              # Example logo/icon asset
│   └── sounds/
│       └── sample.mp3            # Example audio asset
└── src/
    ├── ExamplePlugin.ts          # Main plugin implementation
    └── types.d.ts                # TypeScript ambient module declarations for assets
```

---

## 🧩 Plugin Anatomy & API Reference

### 1. Base Class & Metadata
Every plugin extends the `Plugin` class from `@camelkit/core`:

```typescript
import { Plugin } from '@camelkit/core';

export default class MyPlugin extends Plugin {
  pluginName = 'My Awesome Plugin';
  author = 'YourName';

  init(): void {
    // Called once when plugins are registered at client startup
  }

  start(): void {
    // Called when the plugin is enabled
  }

  stop(): void {
    // Called when the plugin is disabled or the player logs out
  }
}
```

> **Important**: The plugin class must be the **`default`** export of your entry file (`src/ExamplePlugin.ts`).

---

### 2. Game Hooks
CamelKit features a dynamic reflection system. Any method on your plugin class following the pattern:
```typescript
${ClassName}_${methodName}(...args: any[])
```
is **automatically intercepted and invoked** whenever the game calls that function!

#### Popular Game Hooks:
| Hook Name | Description | Common Use Case |
|---|---|---|
| `GameManager_updateMinimap()` | Fires on minimap updates / ticks | Tracking player coordinates & active world map |
| `GameManager_showPlayerChatBubble(id, text)` | Fires when a player speaks in chat | Filtering or highlighting chat messages |
| `EntityManager_createNpc(npc)` | Fires when an NPC spawns/renders nearby | Monster alerts, drop tracking, spawn notifications |
| `EntityManager_createGroundItem(item)` | Fires when an item drops on the ground | Loot notifications, value highlights |
| `ChatManager_focusChatFromGlobalEnter()` | Fires when Enter is pressed to chat | Chat shortcuts & macros |
| `InventoryManager_buildUI()` | Fires when inventory redraws | Custom item overlays or inventory counts |

#### Example:
```typescript
GameManager_updateMinimap(): void {
  const gm = this.gameHooks?.GameManager?.Instance ?? (window as any).gm;
  const player = gm?.currentLocalPlayer?.() || gm?.localPlayer;
  if (player) {
    this.log(`Player tile: X=${Math.round(player.x)}, Z=${Math.round(player.z)}`);
  }
}
```

---

### 3. Accessing Live Game State
Plugins can access live game state and lookup tables directly through:
- `this.gameHooks.GameManager.Instance` (or `window.gm`)
- `this.gameHooks.EntityManager.Instance`
- `this.gameHooks.SocketManager.Instance`
- `this.gameLookups.Skills`
- `this.gameLookups.PlayerActions`

---

### 4. Custom Sidebar Panels
Plugins can add icons to the CamelKit right sidebar and render custom panels:

```typescript
import { PanelManager } from '@camelkit/core';
import panelHtml from '../resources/html/panel.html';
import panelCss from '../resources/css/panel.css';

export default class MyPlugin extends Plugin {
  private panelManager = new PanelManager();

  start(): void {
    // Request sidebar menu slot ('⚡️' icon, 'My Plugin' title)
    const [iconElement, panelContainer] = this.panelManager.requestMenuItem('⚡️', 'My Plugin');

    // Mount HTML and scoped styles
    panelContainer.innerHTML = panelHtml;
    const style = document.createElement('style');
    style.textContent = panelCss;
    panelContainer.appendChild(style);
  }

  stop(): void {
    // Remove from sidebar when plugin stops
    this.panelManager.removeMenuItem('⚡️');
  }
}
```

---

### 5. Persistent Storage (`this.data`)
CamelKit provides per-character reactive storage via `this.data`. Anything stored on `this.data` is automatically persisted into IndexedDB:

```typescript
init(): void {
  this.data.counter = this.data.counter ?? 0;
}

increment(): void {
  this.data.counter += 1; // Auto-saved to IndexedDB!
}
```

---

### 6. User Settings
Add configurable settings that render natively in CamelKit's Settings tab:

```typescript
import { SettingsTypes } from '@camelkit/core';

constructor() {
  super();

  this.settings.enableAlerts = {
    text: 'Enable Sound Alerts',
    type: SettingsTypes.checkbox,
    value: true,
    callback: () => this.log('Alert setting toggled'),
  };

  this.settings.proximityRange = {
    text: 'Proximity Distance (Tiles)',
    type: SettingsTypes.range,
    value: 5,
    min: 1,
    max: 20,
    callback: () => this.log('Range changed'),
  };

  this.settings.playerName = {
    text: 'Highlight Player Name',
    type: SettingsTypes.text,
    value: '',
    callback: () => this.log('Filter updated'),
  };
}
```

---

## 🧪 Testing Locally in CamelKit Client

1. **Build your plugin**:
   ```bash
   yarn build
   ```
2. **Copy the compiled output or source to CamelKit Client**:
   Copy `dist/plugin.js` (or your TypeScript source file) into your CamelKit Client repository:
   ```bash
   cp dist/plugin.js /path/to/Client/packages/client/src/renderer/client/plugins/MyPlugin.js
   ```
3. **Launch the Client**:
   In the `Client` repo:
   ```bash
   pnpm run try
   # or
   pnpm run dev
   ```
   Your plugin will be loaded automatically and listed under your active plugins!

---

## 🌐 Submitting to CamelKit Plugin Hub

Once your plugin is ready:

1. **Push to a public GitHub repository**:
   Ensure your repository has a committed `yarn.lock` and valid `package.json`.
2. **Log into CamelKit Hub**:
   Navigate to the [CamelKit Hub](https://camelkit.dev) and log in with your GitHub account.
3. **Submit Your Plugin**:
   Go to the **Developer Dashboard**, enter your repository URL (e.g. `https://github.com/your-username/my-plugin`), and submit.
4. **Automated Air-Gapped Build**:
   When an admin approves your submission, the CamelKit **Plugin-Builder** CI:
   - Downloads a verified zip of your repo
   - Runs `yarn install --immutable` and `yarn build` in an isolated Node 22 runner
   - Deploys the compiled `dist/plugin.js` to the global edge CDN
   - Mirrors your source code to the [Plugin-Vault](https://github.com/CamelKit/Plugin-Vault) for GPL-3.0 open audit compliance

---

## 📜 License
GPL-3.0-only. All plugins contributed to the CamelKit ecosystem must respect open auditability and EvilQuest community safety guidelines.
