import { Plugin, SettingsTypes, PanelManager } from '@evillite/core';
import panelHtml from '../resources/html/panel.html';
import panelCss from '../resources/css/panel.css';
import logoImage from '../resources/images/icon.png';
import sampleAudio from '../resources/sounds/sample.mp3';

/**
 * ExamplePlugin — Reference & Starter Plugin for CamelCore (EvilQuest)
 *
 * This template demonstrates:
 * 1. Plugin Lifecycle: init(), start(), stop()
 * 2. Settings Management: Checkboxes, Sliders, Text fields with reactive callbacks
 * 3. Persisted Data: Using this.data which automatically saves to IndexedDB per user
 * 4. Game Hooks: Automatically intercepting game methods like GameManager_updateMinimap,
 *    EntityManager_createNpc, and ChatManager_focusChatFromGlobalEnter
 * 5. Accessing Live Game Instances: this.gameHooks.GameManager.Instance (window.gm)
 * 6. UI Creation: Custom sidebar panel using PanelManager and scoped HTML/CSS
 * 7. Bundled Assets: Importing static images and audio via esbuild dataurl loaders
 */
export default class ExamplePlugin extends Plugin {
  // Required plugin metadata
  pluginName = 'ExamplePlugin';
  author = 'CamelCore Contributor';

  // Sidebar Panel Manager instance
  private panelManager = new PanelManager();
  private panelElement: HTMLElement | null = null;
  private menuIconElement: HTMLElement | null = null;

  // Runtime tracking
  private minimapTicks = 0;
  private lastObservedCoords = { x: 0, z: 0 };

  constructor() {
    super();

    // Custom Plugin Settings that appear in CamelCore's Settings UI
    this.settings.showNotifications = {
      text: 'Log Entity Spawns to Console',
      type: SettingsTypes.checkbox,
      value: true,
      callback: () => this.onToggleEntityLogging(),
    };

    this.settings.alertDistance = {
      text: 'Alert Proximity (Tiles)',
      type: SettingsTypes.range,
      value: 8,
      min: 2,
      max: 20,
      callback: () => this.onAlertDistanceChanged(),
    };

    this.settings.customTag = {
      text: 'Custom Tag Label',
      type: SettingsTypes.text,
      value: 'CamelCore',
      callback: () => this.info('Custom Tag changed to:', this.settings.customTag.value),
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Methods
  // ---------------------------------------------------------------------------

  /**
   * Called once when the client initializes plugins.
   * Use this to prepare initial data structures.
   */
  init(): void {
    // this.data is persistent per-character in CamelCore's IndexedDB
    if (typeof this.data.counter !== 'number') {
      this.data.counter = 0;
    }
    if (typeof this.data.totalMinimapUpdates !== 'number') {
      this.data.totalMinimapUpdates = 0;
    }
    if (typeof this.data.observedNpcCount !== 'number') {
      this.data.observedNpcCount = 0;
    }

    this.info('ExamplePlugin initialized.');
  }

  /**
   * Called when the plugin is enabled (or automatically on startup if enabled).
   * Build UI elements, register listeners, and initialize active state here.
   */
  start(): void {
    this.info('ExamplePlugin starting...');

    // Request a sidebar menu item (icon + content panel container)
    // '⚡️' is the sidebar icon, 'Example Plugin' is the tooltip/title
    const [menuIcon, panelContainer] = this.panelManager.requestMenuItem('⚡️', 'Example Plugin');
    this.menuIconElement = menuIcon;
    this.panelElement = panelContainer;

    // Build and inject the panel UI
    this.setupPanelUI(panelContainer);

    this.info('ExamplePlugin started successfully.');
  }

  /**
   * Called when the plugin is disabled or during logout.
   * Clean up all DOM elements, event listeners, audio objects, and timers here.
   */
  stop(): void {
    this.info('ExamplePlugin stopping...');

    // Remove the sidebar icon and close the panel
    this.panelManager.removeMenuItem('⚡️');
    this.panelElement = null;
    this.menuIconElement = null;

    this.info('ExamplePlugin stopped.');
  }

  // ---------------------------------------------------------------------------
  // UI Setup & Interactive Handlers
  // ---------------------------------------------------------------------------

  private setupPanelUI(container: HTMLElement): void {
    // Inject the HTML template
    container.innerHTML = panelHtml;

    // Inject scoped CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = panelCss;
    container.appendChild(styleElement);

    // Set bundled logo image src (bundled as a data URL)
    const logoImg = container.querySelector<HTMLImageElement>('#panel-logo');
    if (logoImg) {
      logoImg.src = logoImage;
    }

    // Set initial values from persisted data
    const counterDisplay = container.querySelector<HTMLElement>('#counter-value');
    if (counterDisplay) {
      counterDisplay.textContent = String(this.data.counter ?? 0);
    }

    const minimapDisplay = container.querySelector<HTMLElement>('#minimap-ticks');
    if (minimapDisplay) {
      minimapDisplay.textContent = String(this.data.totalMinimapUpdates ?? 0);
    }

    const entityDisplay = container.querySelector<HTMLElement>('#entity-count');
    if (entityDisplay) {
      entityDisplay.textContent = String(this.data.observedNpcCount ?? 0);
    }

    // Bind the counter button (persists to this.data)
    const counterBtn = container.querySelector<HTMLButtonElement>('#counter-btn');
    if (counterBtn) {
      counterBtn.onclick = () => {
        this.data.counter = (this.data.counter || 0) + 1;
        if (counterDisplay) {
          counterDisplay.textContent = String(this.data.counter);
        }
        this.info(`Counter incremented to: ${this.data.counter}`);
      };
    }

    // Bind the sample audio playback button
    const soundBtn = container.querySelector<HTMLButtonElement>('#play-sound-btn');
    if (soundBtn) {
      soundBtn.onclick = async () => {
        try {
          const audio = new Audio(sampleAudio);
          await audio.play();
          this.info('Played sample audio asset.');
        } catch (err) {
          this.warn('Could not play audio asset:', err);
        }
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Game Hooks
  // ---------------------------------------------------------------------------
  // Any method formatted as `${ClassName}_${methodName}` is automatically
  // invoked by CamelCore's HookManager whenever that game function executes!
  //
  // Verified Class Signatures available to hook:
  // - GameManager (updateMinimap, showPlayerChatBubble, worldObjectDisplayName, ...)
  // - EntityManager (createNpc, findNearestNpc, createGroundItem, createRemotePlayer, ...)
  // - ChatManager (focusChatFromGlobalEnter, buildUI, ...)
  // - InventoryManager (buildUI, setAdminItemContextEnabled, ...)
  // - SocketManager (openSockets, sendMove, sendChat, ...)
  // - TargetActionManager (handlePrimaryActionAt, pickGround, ...)
  // ---------------------------------------------------------------------------

  /**
   * Hook: Fires every time the game updates the minimap.
   * Good for reading live player coordinates and world state.
   */
  GameManager_updateMinimap(): void {
    this.minimapTicks++;
    this.data.totalMinimapUpdates = (this.data.totalMinimapUpdates || 0) + 1;

    // Access the live GameManager instance via this.gameHooks or window.gm
    const gm = this.gameHooks?.GameManager?.Instance ?? (window as any).gm;
    if (!gm) return;

    // Try reading current player coordinates
    const player = gm.currentLocalPlayer?.() || gm.localPlayer;
    if (player && typeof player.x === 'number' && typeof player.z === 'number') {
      this.lastObservedCoords = { x: Math.round(player.x), z: Math.round(player.z) };

      if (this.panelElement) {
        const coordsEl = this.panelElement.querySelector<HTMLElement>('#player-coords');
        if (coordsEl) {
          coordsEl.textContent = `X: ${this.lastObservedCoords.x}, Z: ${this.lastObservedCoords.z}`;
        }
      }
    }

    if (this.panelElement) {
      const ticksEl = this.panelElement.querySelector<HTMLElement>('#minimap-ticks');
      if (ticksEl) {
        ticksEl.textContent = String(this.data.totalMinimapUpdates);
      }
    }
  }

  /**
   * Hook: Fires whenever a new NPC entity is spawned / rendered in-world.
   */
  EntityManager_createNpc(npc: any): void {
    this.data.observedNpcCount = (this.data.observedNpcCount || 0) + 1;

    if (this.settings.showNotifications?.value && npc?.name) {
      this.info(`[NPC Spawned] ${npc.name} (ID: ${npc.id ?? 'unknown'})`);
    }

    if (this.panelElement) {
      const entityEl = this.panelElement.querySelector<HTMLElement>('#entity-count');
      if (entityEl) {
        entityEl.textContent = String(this.data.observedNpcCount);
      }
    }
  }

  /**
   * Hook: Fires whenever a ground item is placed or dropped in the world.
   */
  EntityManager_createGroundItem(item: any): void {
    if (this.settings.showNotifications?.value) {
      this.info(`[Ground Item] Item appeared:`, item);
    }
  }

  /**
   * Hook: Fires when the player presses Enter to focus the chat input.
   */
  ChatManager_focusChatFromGlobalEnter(): void {
    this.info('Chat input focused by user.');
  }

  // ---------------------------------------------------------------------------
  // Settings Callbacks
  // ---------------------------------------------------------------------------

  private onToggleEntityLogging(): void {
    this.info(`Entity spawn logging is now: ${this.settings.showNotifications.value ? 'ENABLED' : 'DISABLED'}`);
  }

  private onAlertDistanceChanged(): void {
    this.info(`Alert Proximity updated to: ${this.settings.alertDistance.value} tiles`);
  }
}
