type ToastListener = (message: string) => void;

const listeners = new Set<ToastListener>();

/**
 * Minimal toast bus.
 *
 * Achievement unlocks are checked deep inside services and screens that have no
 * access to the `showToast` callback owned by `App`. Threading a callback
 * through every one of those call sites only to pass an empty function was how
 * unlock notifications silently disappeared, so the app root subscribes once
 * and screens publish here instead.
 */
export const toastService = {
  show(message: string): void {
    listeners.forEach((listener) => listener(message));
  },

  subscribe(listener: ToastListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
