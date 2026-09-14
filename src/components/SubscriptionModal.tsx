import React, { useState } from 'react';
import { UserState } from '../types';
import { StorageService, getLocalDateKey } from '../services/storageService';
import { audioService } from '../services/audioService';
import confetti from 'canvas-confetti';

interface SubscriptionModalProps {
  userState: UserState;
  onUpdateState: (newState: UserState) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  userState,
  onUpdateState,
  onClose,
  onShowToast,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [paymentMethod, setPaymentMethod] = useState<'sbp' | 'card' | 'tinkoff'>('sbp');
  const [isProcessing, setIsProcessing] = useState(false);

  const plans = {
    monthly: { id: 'monthly', title: 'Месячная подписка', price: '390 ₽', period: 'в месяц', badge: '' },
    yearly: { id: 'yearly', title: 'Годовая подписка', price: '2 490 ₽', period: 'в год (207 ₽/мес)', badge: '🔥 Скидка 40%' },
    lifetime: { id: 'lifetime', title: 'Навсегда PRO', price: '4 990 ₽', period: 'разовый платёж', badge: '👑 Безлимит' },
  };

  const handlePay = () => {
    setIsProcessing(true);
    audioService.playClick();

    setTimeout(() => {
      userState.account.tier = 'pro';
      userState.account.subscriptionPlan = selectedPlan;
      userState.account.subscribedDate = getLocalDateKey();

      StorageService.save(userState);
      StorageService.checkAndUnlockAchievements(userState, () => {});
      onUpdateState({ ...userState });

      setIsProcessing(false);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      audioService.playFanfare();

      onShowToast('👑 PRO активирован в демо-режиме. Для реальной оплаты подключите платёжный backend.');
      onClose();
    }, 1500);
  };

  return (
    <div className="ovl" onClick={onClose}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <span className="tag" style={{ background: 'var(--sun)', fontSize: '13px', padding: '4px 14px' }}>
            👑 IMMERSION PRO
          </span>
          <h2 id="subscription-dialog-title" style={{ fontFamily: 'Unbounded', fontSize: '26px', margin: '12px 0 6px' }}>
            Полное Погружение без ограничений
          </h2>
          <p className="sub" style={{ margin: '0 auto' }}>
            Демо-режим: открой все уроки B2-C1, безлимитные карточки SRS, генератор любых текстов и заморозку стрика.
          </p>
        </div>

        {/* PRO Benefits Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '18px 0' }}>
          <div className="chip sea" style={{ padding: '8px 12px', fontSize: '13px' }}>
            🔓 Все уроки A1–C1 разблокированы
          </div>
          <div className="chip sea" style={{ padding: '8px 12px', fontSize: '13px' }}>
            ⚡ Безлимитные карточки SRS
          </div>
          <div className="chip sea" style={{ padding: '8px 12px', fontSize: '13px' }}>
            ✨ Генерация любых своих текстов
          </div>
          <div className="chip sea" style={{ padding: '8px 12px', fontSize: '13px' }}>
            🔥 Заморозка стрика при пропуске
          </div>
        </div>

        {/* Plan Selector */}
        <div style={{ display: 'grid', gap: '10px', margin: '20px 0' }}>
          {(Object.keys(plans) as (keyof typeof plans)[]).map((key) => {
            const plan = plans[key];
            const isSel = selectedPlan === key;

            return (
              <div
                key={key}
                className={`lcard ${isSel ? 'sel' : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}
                onClick={() => {
                  audioService.playClick();
                  setSelectedPlan(key);
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <b>{plan.title}</b>
                    {plan.badge && <span className="chip coral" style={{ fontSize: '11px', padding: '2px 8px' }}>{plan.badge}</span>}
                  </div>
                  <small style={{ color: 'var(--ink2)' }}>{plan.period}</small>
                </div>
                <div style={{ fontFamily: 'Unbounded', fontSize: '20px', fontWeight: 800 }}>
                  {plan.price}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Method Selector */}
        <div style={{ margin: '16px 0' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--pine3)', marginBottom: '8px' }}>
            Способ оплаты:
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`catchip ${paymentMethod === 'sbp' ? 'on' : ''}`}
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setPaymentMethod('sbp')}
            >
              📲 СБП (Быстрый платеж)
            </button>
            <button
              className={`catchip ${paymentMethod === 'card' ? 'on' : ''}`}
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setPaymentMethod('card')}
            >
              💳 Банковская карта
            </button>
            <button
              className={`catchip ${paymentMethod === 'tinkoff' ? 'on' : ''}`}
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setPaymentMethod('tinkoff')}
            >
              🟡 T-Pay / SberPay
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          className="btn sun big"
          style={{ width: '100%', marginTop: '10px' }}
          disabled={isProcessing}
          onClick={handlePay}
        >
          {isProcessing ? 'Обработка платежа...' : `Активировать PRO (демо) · ${plans[selectedPlan].price}`}
        </button>

        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <button className="btn ghost" onClick={onClose}>
            Спасибо, позже
          </button>
        </div>
      </div>
    </div>
  );
};
