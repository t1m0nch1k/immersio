import React, { useEffect, useState } from 'react';
import {
  UpdateService,
  UpdateCheckResult,
  UpdateProgress,
  getCustomUpdateUrl,
  setCustomUpdateUrl,
  DEFAULT_UPDATE_URL
} from '../services/updateService';

interface UpdateModalProps {
  checkResult: UpdateCheckResult | null;
  onClose: () => void;
  onReload: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ checkResult, onClose, onReload }) => {
  const [progress, setProgress] = useState<UpdateProgress>({ stage: 'idle', percent: 0 });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customUrl, setCustomUrl] = useState(getCustomUpdateUrl());
  const updateService = UpdateService.getInstance();

  useEffect(() => {
    const unsub = updateService.subscribe((p) => {
      setProgress(p);
    });
    return unsub;
  }, []);

  if (!checkResult && progress.stage === 'idle') return null;

  const manifest = checkResult?.manifest;
  const isUpdating = progress.stage === 'downloading' || progress.stage === 'verifying' || progress.stage === 'unpacking' || progress.stage === 'downloading_apk';
  const isReady = progress.stage === 'ready';
  const isError = progress.stage === 'error';

  const handleStartUpdate = () => {
    if (!manifest) return;
    if (checkResult?.updateType === 'apk') {
      updateService.startApkUpdate(manifest);
    } else {
      updateService.startBundleUpdate(manifest);
    }
  };

  const handleSaveUrl = () => {
    setCustomUpdateUrl(customUrl);
    setShowAdvanced(false);
  };

  const handleResetUrl = () => {
    setCustomUrl(DEFAULT_UPDATE_URL);
    setCustomUpdateUrl(DEFAULT_UPDATE_URL);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--surface-color, #ffffff)',
          color: 'var(--text-color, #222)',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, #e0e0e0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>
              {isReady ? '🎉' : isError ? '⚠️' : isUpdating ? '⏳' : '🚀'}
            </span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              {isReady
                ? 'Обновление готово!'
                : isError
                ? 'Ошибка обновления'
                : isUpdating
                ? 'Загрузка обновления...'
                : checkResult?.hasUpdate
                ? `Новая версия ${manifest?.appVersion || ''}`
                : 'Проверка обновлений'}
            </h3>
          </div>
          {!isUpdating && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '22px',
                cursor: 'pointer',
                color: 'var(--text-muted, #777)',
                padding: '4px'
              }}
              title="Закрыть"
            >
              ✕
            </button>
          )}
        </div>

        {checkResult?.hasUpdate && manifest && !isReady && !isUpdating && (
          <div style={{ fontSize: '0.9rem', lineHeight: '1.45' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(52, 199, 89, 0.15)',
                  color: '#28a745',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                {checkResult.updateType === 'apk' ? '📦 Нативный APK' : '⚡ Быстрое OTA-обновление'}
              </span>
              {manifest.bundleSizeBytes && (
                <span
                  style={{
                    background: 'rgba(0, 122, 255, 0.1)',
                    color: '#007aff',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  {(manifest.bundleSizeBytes / (1024 * 1024)).toFixed(2)} МБ
                </span>
              )}
            </div>

            {manifest.changelog && (
              <div
                style={{
                  background: 'var(--bg-card, #f8f9fa)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #e9ecef)',
                  whiteSpace: 'pre-line',
                  fontSize: '0.88rem'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted, #555)' }}>
                  Что нового:
                </div>
                {manifest.changelog}
              </div>
            )}
          </div>
        )}

        {isUpdating && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>
                {progress.stage === 'downloading'
                  ? 'Скачивание бандла...'
                  : progress.stage === 'verifying'
                  ? 'Проверка контрольной суммы SHA-256...'
                  : progress.stage === 'unpacking'
                  ? 'Распаковка и подготовка файлов...'
                  : progress.stage === 'downloading_apk'
                  ? 'Скачивание APK...'
                  : 'Подготовка...'}
              </span>
              <span style={{ fontWeight: 700 }}>{progress.percent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'var(--border-color, #e0e0e0)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${progress.percent}%`,
                  height: '100%',
                  background: 'var(--primary-color, #2b825b)',
                  transition: 'width 0.2s ease'
                }}
              />
            </div>
          </div>
        )}

        {isReady && (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-color, #333)' }}>
            {checkResult?.updateType === 'apk'
              ? 'Установочный файл скачан. Сейчас откроется мастер установки Android.'
              : 'Файлы обновления успешно загружены и проверены. Нажмите кнопку ниже, чтобы перезагрузить приложение с новой версией.'}
          </div>
        )}

        {isError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 59, 48, 0.1)',
              color: '#d32f2f',
              fontSize: '0.88rem'
            }}
          >
            {progress.message || 'Произошла непредвиденная ошибка при обновлении'}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', justifyContent: 'flex-end' }}>
          {!isUpdating && !isReady && (
            <button
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #ccc)',
                background: 'transparent',
                color: 'var(--text-color, #555)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Позже
            </button>
          )}

          {checkResult?.hasUpdate && !isUpdating && !isReady && (
            <button
              onClick={handleStartUpdate}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary-color, #2b825b)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(43, 130, 91, 0.3)'
              }}
            >
              {checkResult.updateType === 'apk' ? 'Скачать и установить APK' : 'Обновить сейчас'}
            </button>
          )}

          {isReady && (
            <button
              onClick={onReload}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary-color, #2b825b)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              {checkResult?.updateType === 'apk' ? 'Открыть установщик' : 'Перезагрузить приложение'}
            </button>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-color, #eee)', paddingTop: '10px', marginTop: '4px' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.78rem',
              color: 'var(--text-muted, #888)',
              cursor: 'pointer',
              padding: 0
            }}
          >
            {showAdvanced ? '▲ Скрыть настройки источника' : '⚙️ Настройки источника обновлений'}
          </button>

          {showAdvanced && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted, #666)' }}>
                URL манифеста версий (version.json):
              </label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #ccc)',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleResetUrl}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.75rem',
                    color: '#777',
                    cursor: 'pointer'
                  }}
                >
                  По умолчанию
                </button>
                <button
                  onClick={handleSaveUrl}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #aaa',
                    background: 'var(--surface-color, #eee)',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
