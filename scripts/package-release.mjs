import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const updatesDir = resolve(root, 'updates');
const wwwDir = resolve(root, 'android/app/src/main/assets/www');
const packageJsonPath = resolve(root, 'package.json');

console.log('===> 1. Building web bundle for Android...');
execFileSync(process.execPath, [resolve(root, 'scripts/build-android-web.mjs')], { cwd: root, stdio: 'inherit' });

console.log('===> 2. Preparing updates directory...');
await mkdir(updatesDir, { recursive: true });

const bundleZipPath = resolve(updatesDir, 'bundle.zip');

console.log('===> 3. Packaging bundle.zip...');
// execFileSync spawns without a shell, so a '*' glob is never expanded:
// list the www entries explicitly instead. Prefer the `zip` CLI, which
// writes a real ZIP archive everywhere; GNU tar would silently write a
// POSIX tar under a .zip name (only bsdtar on Windows writes a real ZIP).
// The old archive is removed first: `zip` updates in place, and stale
// hashed chunks from a previous build must not survive into the new one.
const wwwEntries = await readdir(wwwDir);
await rm(bundleZipPath, { force: true });
try {
  execFileSync('zip', ['-qr', bundleZipPath, ...wwwEntries], { cwd: wwwDir, stdio: 'inherit' });
} catch (e) {
  console.log('`zip` CLI not available, falling back to tar...');
  try {
    execFileSync('tar', ['-a', '-c', '-f', bundleZipPath, ...wwwEntries], { cwd: wwwDir, stdio: 'inherit' });
  } catch (e2) {
    // Fallback to powershell on Windows if tar fails
    console.log('Falling back to PowerShell Compress-Archive...');
    execFileSync('powershell', ['-Command', `Compress-Archive -Path '${wwwDir}\\*' -DestinationPath '${bundleZipPath}' -Force`], { stdio: 'inherit' });
  }
}

console.log('===> 4. Calculating bundle checksum & stats...');
const zipBuffer = await readFile(bundleZipPath);
const bundleSha256 = createHash('sha256').update(zipBuffer).digest('hex');
const bundleStats = await stat(bundleZipPath);

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const appVersion = packageJson.version || '2.0.0';

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const bundleVersion = `${yyyy}.${mm}.${dd}.${Math.floor(Date.now() / 1000) % 10000}`;

// Check if an APK exists in outputs to include in the release
const releaseApkPath = resolve(root, 'android/app/build/outputs/apk/release/app-release.apk');
const debugApkPath = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
let apkSha256 = '';
let targetApkUrl = 'https://raw.githubusercontent.com/t1m0nch1k/immersio/main/updates/app-release.apk';

const chosenApk = existsSync(releaseApkPath) ? releaseApkPath : (existsSync(debugApkPath) ? debugApkPath : null);
if (chosenApk) {
  const destApk = resolve(updatesDir, 'app-release.apk');
  await copyFile(chosenApk, destApk);
  const apkBuffer = await readFile(destApk);
  apkSha256 = createHash('sha256').update(apkBuffer).digest('hex');
  console.log(`Copied ${chosenApk} to updates/app-release.apk`);
}

const manifest = {
  appVersion,
  appBuild: 1,
  bundleVersion,
  bundleUrl: 'https://raw.githubusercontent.com/t1m0nch1k/immersio/main/updates/bundle.zip',
  bundleSha256,
  bundleSizeBytes: bundleStats.size,
  apkUrl: targetApkUrl,
  apkSha256: apkSha256 || undefined,
  changelog: '• Озвучка уроков на иврите и казахском\n• Приложение теперь устанавливается и работает офлайн\n• Загрузка стала заметно быстрее\n• Все 10 языков на главной странице',
  releasedAt: new Date().toISOString()
};

const versionJsonPath = resolve(updatesDir, 'version.json');
await writeFile(versionJsonPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log('\n=============================================');
console.log('✓ Release package created successfully:');
console.log(`  Bundle version: ${bundleVersion}`);
console.log(`  Bundle SHA256:  ${bundleSha256}`);
console.log(`  Bundle size:    ${(bundleStats.size / 1024).toFixed(1)} KB`);
console.log(`  Manifest:       ${versionJsonPath}`);
console.log('=============================================\n');
