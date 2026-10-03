import { toastService } from './toastService';

class ReminderService {
  /**
   * Syncs the user's reminder preferences with the native Android alarm
   * scheduler or web notification timer.
   */
  public syncReminder(enabled: boolean, timeStr: string): void {
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr || '20', 10);
    const minute = parseInt(minuteStr || '0', 10);

    // 1. Android Native Host bridge
    if (window.AndroidHost?.scheduleReminder) {
      try {
        window.AndroidHost.scheduleReminder(enabled, hour, minute);
        return;
      } catch {
        // Fall back to web notifications
      }
    }

    // 2. Web browser Notification permission request if enabled
    if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }

  /**
   * Triggers an immediate test notification so the user can verify that
   * reminders work properly on their device.
   */
  public async sendTestNotification(): Promise<boolean> {
    // 1. Android Native Host bridge
    if (window.AndroidHost?.sendTestReminder) {
      try {
        window.AndroidHost.sendTestReminder();
        toastService.show('🔔 Тестовое напоминание отправлено!');
        return true;
      } catch {
        // Fall through
      }
    }

    // 2. Web Notification API fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification('🔥 Время для Погружения!', {
            body: 'Сохрани свою ударную серию — пройди короткий урок прямо сейчас!',
            icon: '/favicon.ico',
          });
          toastService.show('🔔 Тестовое уведомление показано!');
          return true;
        } catch {
          // Fall through
        }
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('🔥 Время для Погружения!', {
            body: 'Сохрани свою ударную серию — пройди короткий урок прямо сейчас!',
            icon: '/favicon.ico',
          });
          toastService.show('🔔 Тестовое уведомление показано!');
          return true;
        }
      }
    }

    toastService.show('Разрешите показ уведомлений в настройках браузера или телефона');
    return false;
  }
}

export const reminderService = new ReminderService();
