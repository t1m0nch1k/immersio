import React, { useEffect, useState, useCallback } from 'react';
import { hapticService } from '../services/hapticService';
import { BrandMark } from './BrandMark';

interface SplashScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1700,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const finish = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    hapticService.trigger('light');
    setTimeout(() => {
      onFinish();
    }, 450);
  }, [isExiting, onFinish]);

  useEffect(() => {
    const timer = setTimeout(() => {
      finish();
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [finish, minDurationMs]);

  return (
    <div
      className={`splash-screen ${isExiting ? 'splash-screen-exit' : ''}`}
      onClick={finish}
      role="button"
      tabIndex={0}
      aria-label="Запустить приложение"
    >
      {/* Background ambient water glow & subtle ripples */}
      <div className="splash-ambient-glow" />

      <div className="splash-center">
        {/* Expanding concentric ripple rings */}
        <div className="splash-ripple splash-ripple-1" />
        <div className="splash-ripple splash-ripple-2" />

        {/* The Buoy / Brand Mark */}
        <div className="splash-mark">
          <BrandMark />
        </div>

        {/* App Title with typography transition */}
        <div className="splash-brand">
          <h1 className="splash-title">ПОГРУЖЕНИЕ</h1>
          <p className="splash-subtitle">Изучение языков через контекст</p>
        </div>

        {/* Subtle breathing dots */}
        <div className="splash-loader">
          <span className="splash-dot" />
          <span className="splash-dot" />
          <span className="splash-dot" />
        </div>
      </div>
    </div>
  );
};
