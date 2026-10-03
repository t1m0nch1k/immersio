export type HapticType = 'light' | 'medium' | 'success' | 'warning' | 'error';

class HapticService {
  private enabled: boolean = true;
  private lastTriggerTime: number = 0;
  private listenersInitialized: boolean = false;

  constructor() {
    try {
      const stored = localStorage.getItem('pogruzhenie_haptic_enabled');
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    } catch {
      // In case localStorage is blocked
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem('pogruzhenie_haptic_enabled', enabled ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public trigger(type: HapticType = 'light'): void {
    if (!this.enabled) return;

    const now = Date.now();
    // Throttle high-frequency taps to prevent haptic motor queue saturation
    if (type === 'light' && now - this.lastTriggerTime < 50) {
      return;
    }
    this.lastTriggerTime = now;

    // 1. Native Android WebView bridge
    if (window.AndroidHost?.vibrate) {
      try {
        window.AndroidHost.vibrate(type);
        return;
      } catch {
        // Fall back to navigator.vibrate
      }
    }

    // 2. Web / PWA Vibration API fallback
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        switch (type) {
          case 'light':
            navigator.vibrate(12);
            break;
          case 'medium':
            navigator.vibrate(24);
            break;
          case 'success':
            navigator.vibrate([15, 45, 20]);
            break;
          case 'warning':
          case 'error':
            navigator.vibrate([30, 50, 30]);
            break;
        }
      } catch {
        // Vibration may be restricted or unsupported on some desktop browsers
      }
    }
  }

  /**
   * Installs a lightweight global pointerdown listener that automatically
   * delivers crisp tactile feedback to all interactive UI components.
   */
  public initHapticListeners(): void {
    if (this.listenersInitialized || typeof window === 'undefined') return;
    this.listenersInitialized = true;

    const interactiveSelector = [
      'button',
      '[role="button"]',
      '[role="tab"]',
      'a[href]',
      '.btn',
      '.iconbtn',
      '.hchip',
      '.lcard',
      '.tab-btn',
      '.wrow',
      '.pb',
      '.av',
      '.chip',
      '.virtual-key',
      '.grammar-token-zone button',
      '.tk.new'
    ].join(',');

    window.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        if (!this.enabled) return;
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const interactive = target.closest(interactiveSelector) as HTMLElement | null;
        if (!interactive) return;

        // Skip if explicitly marked or disabled
        if (interactive.dataset.noHaptic === 'true' || interactive.hasAttribute('disabled')) {
          return;
        }

        this.trigger('light');
      },
      { passive: true, capture: true }
    );
  }
}

export const hapticService = new HapticService();
