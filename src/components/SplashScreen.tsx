import React, { useEffect, useState, useCallback } from 'react';
import { hapticService } from '../services/hapticService';

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
          {/* 3 Organic Swaying Waves SVG */}
          <svg
            className="splash-waves-svg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <clipPath id="splashMarkClip">
                <rect x="0" y="0" width="100" height="100" rx="24" />
              </clipPath>
            </defs>

            <g clipPath="url(#splashMarkClip)">
              {/* Wave 1: Top Surf */}
              <path
                className="splash-wave splash-wave-top"
                d="M -50 32 Q -25 24 0 32 T 50 32 T 100 32 T 150 32"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Wave 2: Middle Crest */}
              <path
                className="splash-wave splash-wave-mid"
                d="M -50 50 Q -25 42 0 50 T 50 50 T 100 50 T 150 50"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Wave 3: Deep Swell */}
              <path
                className="splash-wave splash-wave-bot"
                d="M -50 68 Q -25 60 0 68 T 50 68 T 100 68 T 150 68"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
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
