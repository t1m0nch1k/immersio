import assert from 'node:assert/strict';

// Test evaluateUpdateNeed logic
function evaluateUpdateNeed(current, manifest) {
  const minNative = Number(manifest.minNativeBuild) || 0;
  if (current.isNative && minNative > current.appBuild) {
    return { hasUpdate: true, updateType: 'apk' };
  }

  const manifestBuild = Number(manifest.appBuild) || 0;
  if (current.isNative && manifestBuild > current.appBuild && manifest.apkUrl) {
    return { hasUpdate: true, updateType: 'apk' };
  }

  if (manifest.bundleVersion && manifest.bundleVersion !== current.bundleVersion) {
    return { hasUpdate: true, updateType: 'bundle' };
  }

  return { hasUpdate: false, updateType: 'none' };
}

console.log('Testing update evaluation logic...');

// 1. Same version, no update
{
  const current = { appVersion: '0.1.0', appBuild: 1, bundleVersion: '2026.10.03', isNative: true };
  const manifest = { appVersion: '0.1.0', appBuild: 1, bundleVersion: '2026.10.03' };
  const result = evaluateUpdateNeed(current, manifest);
  assert.equal(result.hasUpdate, false);
  assert.equal(result.updateType, 'none');
}

// 2. New OTA bundle available
{
  const current = { appVersion: '0.1.0', appBuild: 1, bundleVersion: 'built-in', isNative: true };
  const manifest = { appVersion: '0.1.0', appBuild: 1, bundleVersion: '2026.10.04.1', bundleUrl: 'https://example.com/bundle.zip' };
  const result = evaluateUpdateNeed(current, manifest);
  assert.equal(result.hasUpdate, true);
  assert.equal(result.updateType, 'bundle');
}

// 3. New Native APK required due to minNativeBuild
{
  const current = { appVersion: '0.1.0', appBuild: 1, bundleVersion: 'built-in', isNative: true };
  const manifest = {
    appVersion: '0.2.0',
    appBuild: 2,
    minNativeBuild: 2,
    bundleVersion: '2026.10.04.1',
    apkUrl: 'https://example.com/app.apk'
  };
  const result = evaluateUpdateNeed(current, manifest);
  assert.equal(result.hasUpdate, true);
  assert.equal(result.updateType, 'apk');
}

// 4. Web client ignores native build bump if not native
{
  const current = { appVersion: '2.0.0', appBuild: 1, bundleVersion: 'web', isNative: false };
  const manifest = {
    appVersion: '2.1.0',
    appBuild: 2,
    minNativeBuild: 2,
    bundleVersion: '2026.10.04.1'
  };
  const result = evaluateUpdateNeed(current, manifest);
  assert.equal(result.hasUpdate, true);
  assert.equal(result.updateType, 'bundle');
}

console.log('✓ All update logic tests passed!');
