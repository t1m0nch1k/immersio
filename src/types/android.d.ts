export interface AndroidHostInterface {
  openExternal?: (url: string) => void;
  setTheme?: (dark: boolean) => void;
  openAuth?: (url: string) => void;
  getAppInfo?: () => string;
  downloadAndApplyBundle?: (bundleUrl: string, expectedSha256: string, newBundleVersion: string) => void;
  reloadApp?: () => void;
  rollbackBundle?: () => void;
  downloadAndInstallApk?: (apkUrl: string, expectedSha256: string) => void;
}

declare global {
  interface Window {
    AndroidHost?: AndroidHostInterface;
    /** Installed by the shell; see `AUTH_RESULT_HANDLER` in MainActivity.kt. */
    __pogruzhenieAuthResult?: (url: string) => void;
    __onUpdateProgress?: (data: { stage: string; percent: number }) => void;
    __onUpdateComplete?: (data: { type: string; version?: string }) => void;
    __onUpdateError?: (data: { error: string; message?: string }) => void;
  }
}
