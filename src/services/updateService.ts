export interface UpdateManifest {
  appVersion: string;
  appBuild: number;
  bundleVersion: string;
  bundleUrl: string;
  bundleSha256?: string;
  bundleSizeBytes?: number;
  apkUrl?: string;
  apkSha256?: string;
  minNativeBuild?: number;
  changelog?: string;
  releasedAt?: string;
}

export interface AppVersionInfo {
  appVersion: string;
  appBuild: number;
  bundleVersion: string;
  hasLiveBundle: boolean;
  isNative: boolean;
}

export type UpdateType = 'none' | 'bundle' | 'apk';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  updateType: UpdateType;
  currentInfo: AppVersionInfo;
  manifest?: UpdateManifest;
  error?: string;
}

export interface UpdateProgress {
  stage: 'idle' | 'checking' | 'downloading' | 'verifying' | 'unpacking' | 'downloading_apk' | 'ready' | 'error';
  percent: number;
  message?: string;
}


export const DEFAULT_UPDATE_URL =
  'https://raw.githubusercontent.com/t1m0nch1k/immersio/main/updates/version.json';

const UPDATE_URL_KEY = 'pogruzhenie_update_url';
const LAST_CHECK_KEY = 'pogruzhenie_last_update_check';

export function getCustomUpdateUrl(): string {
  try {
    return localStorage.getItem(UPDATE_URL_KEY) || DEFAULT_UPDATE_URL;
  } catch {
    return DEFAULT_UPDATE_URL;
  }
}

export function setCustomUpdateUrl(url: string): void {
  try {
    if (!url || url.trim() === '' || url === DEFAULT_UPDATE_URL) {
      localStorage.removeItem(UPDATE_URL_KEY);
    } else {
      localStorage.setItem(UPDATE_URL_KEY, url.trim());
    }
  } catch {
    // localStorage not accessible
  }
}

export function getAppVersionInfo(): AppVersionInfo {
  if (typeof window !== 'undefined' && window.AndroidHost && typeof window.AndroidHost.getAppInfo === 'function') {
    try {
      const raw = window.AndroidHost.getAppInfo();
      const parsed = JSON.parse(raw);
      return {
        appVersion: parsed.appVersion || '0.1.0',
        appBuild: Number(parsed.appBuild) || 1,
        bundleVersion: parsed.bundleVersion || 'built-in',
        hasLiveBundle: Boolean(parsed.hasLiveBundle),
        isNative: true
      };
    } catch (e) {
      console.warn('Failed to parse getAppInfo', e);
    }
  }
  return {
    appVersion: '2.0.0',
    appBuild: 1,
    bundleVersion: 'web',
    hasLiveBundle: false,
    isNative: false
  };
}

/**
 * Compares current version info with the manifest to decide if an update is needed.
 */
export function evaluateUpdateNeed(
  current: AppVersionInfo,
  manifest: UpdateManifest
): { hasUpdate: boolean; updateType: UpdateType } {
  // If native build is required
  const minNative = Number(manifest.minNativeBuild) || 0;
  if (current.isNative && minNative > current.appBuild) {
    return { hasUpdate: true, updateType: 'apk' };
  }

  const manifestBuild = Number(manifest.appBuild) || 0;
  if (current.isNative && manifestBuild > current.appBuild && manifest.apkUrl) {
    return { hasUpdate: true, updateType: 'apk' };
  }

  // If web bundle version differs
  if (manifest.bundleVersion && manifest.bundleVersion !== current.bundleVersion) {
    return { hasUpdate: true, updateType: 'bundle' };
  }

  return { hasUpdate: false, updateType: 'none' };
}

export class UpdateService {
  private static instance: UpdateService;
  private progressListeners: Set<(progress: UpdateProgress) => void> = new Set();
  private currentProgress: UpdateProgress = { stage: 'idle', percent: 0 };

  private constructor() {
    if (typeof window !== 'undefined') {
      window.__onUpdateProgress = (data) => {
        const stage = data.stage as UpdateProgress['stage'];
        this.emitProgress({ stage: stage || 'downloading', percent: data.percent ?? 0 });
      };

      window.__onUpdateComplete = (data) => {
        if (data.type === 'bundle') {
          this.emitProgress({
            stage: 'ready',
            percent: 100,
            message: `Обновление ${data.version || ''} готово! Перезагрузите приложение.`
          });
        } else {
          this.emitProgress({
            stage: 'ready',
            percent: 100,
            message: 'Пакет APK готов к установке.'
          });
        }
      };

      window.__onUpdateError = (data) => {
        this.emitProgress({
          stage: 'error',
          percent: 0,
          message: data.message || data.error || 'Ошибка при обновлении'
        });
      };
    }
  }

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  public subscribe(listener: (progress: UpdateProgress) => void): () => void {
    this.progressListeners.add(listener);
    listener(this.currentProgress);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  private emitProgress(progress: UpdateProgress) {
    this.currentProgress = progress;
    for (const listener of this.progressListeners) {
      try {
        listener(progress);
      } catch (err) {
        console.error('Progress listener error', err);
      }
    }
  }

  public async checkForUpdates(customUrl?: string): Promise<UpdateCheckResult> {
    const currentInfo = getAppVersionInfo();
    const url = customUrl || getCustomUpdateUrl();

    try {
      this.emitProgress({ stage: 'checking', percent: 0, message: 'Проверка наличия обновлений...' });

      const res = await fetch(`${url}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        const msg = `Сервер обновлений вернул статус ${res.status}`;
        this.emitProgress({ stage: 'error', percent: 0, message: msg });
        return { hasUpdate: false, updateType: 'none', currentInfo, error: msg };
      }

      const manifest: UpdateManifest = await res.json();
      try {
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      } catch {
        // ignore
      }

      const evaluation = evaluateUpdateNeed(currentInfo, manifest);

      this.emitProgress({
        stage: 'idle',
        percent: 0,
        message: evaluation.hasUpdate ? 'Найдено обновление' : 'Установлена последняя версия'
      });

      return {
        hasUpdate: evaluation.hasUpdate,
        updateType: evaluation.updateType,
        currentInfo,
        manifest
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось связаться с сервером обновлений';
      this.emitProgress({ stage: 'error', percent: 0, message: msg });
      return { hasUpdate: false, updateType: 'none', currentInfo, error: msg };
    }
  }

  public startBundleUpdate(manifest: UpdateManifest): boolean {
    if (typeof window === 'undefined' || !window.AndroidHost?.downloadAndApplyBundle) {
      this.emitProgress({
        stage: 'error',
        percent: 0,
        message: 'OTA-обновления доступны только в нативном Android-приложении'
      });
      return false;
    }

    this.emitProgress({ stage: 'downloading', percent: 0, message: 'Начало загрузки бандла...' });
    window.AndroidHost.downloadAndApplyBundle(
      manifest.bundleUrl,
      manifest.bundleSha256 || '',
      manifest.bundleVersion
    );
    return true;
  }

  public startApkUpdate(manifest: UpdateManifest): boolean {
    if (!manifest.apkUrl) {
      this.emitProgress({ stage: 'error', percent: 0, message: 'Ссылка на APK не указана в манифесте' });
      return false;
    }
    if (typeof window === 'undefined' || !window.AndroidHost?.downloadAndInstallApk) {
      // In browser, open download link directly
      window.open(manifest.apkUrl, '_blank');
      return true;
    }

    this.emitProgress({ stage: 'downloading_apk', percent: 0, message: 'Загрузка APK...' });
    window.AndroidHost.downloadAndInstallApk(manifest.apkUrl, manifest.apkSha256 || '');
    return true;
  }

  public reloadApp(): void {
    if (typeof window !== 'undefined' && window.AndroidHost?.reloadApp) {
      window.AndroidHost.reloadApp();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  public rollbackToAssets(): void {
    if (typeof window !== 'undefined' && window.AndroidHost?.rollbackBundle) {
      window.AndroidHost.rollbackBundle();
    }
  }
}
