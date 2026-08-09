import { useNavigate } from 'react-router-dom';

import { SparklesIcon } from '@/assets/icons';
import { cn } from '@/common/utils';

import s from './NoirTopBar.module.scss';

type NoirTopBarProps = {
  mode?: 'brand' | 'back';
  title?: string;
  avatarSrc?: string;
  credits?: number;
  onCreditsClick?: () => void;
  onUpgradeClick?: () => void;
  onBack?: () => void;
  showUpgrade?: boolean;
};

export function NoirTopBar({
  mode = 'brand',
  title,
  avatarSrc,
  credits = 0,
  onCreditsClick,
  onUpgradeClick,
  onBack,
  showUpgrade = false,
}: NoirTopBarProps) {
  const navigate = useNavigate();
  const showCredits = credits > 0 || !showUpgrade;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/explore');
  };

  if (mode === 'back') {
    return (
      <header className={s.bar}>
        <button type="button" className={s.backButton} onClick={handleBack}>
          <span
            className={cn('material-symbols-outlined filled', [s.backIcon])}
          >
            arrow_back_ios_new
          </span>
        </button>
        <div className={s.backTitle}>{title}</div>
        <div className={s.spacer} />
      </header>
    );
  }

  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <div className={s.avatarWrap}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className={s.avatar} />
          ) : null}
        </div>
        <div className={s.wordmark} aria-label="SweetMe">
          <span className={s.wordmarkPrimary}>Sweet</span>
          <span className={s.wordmarkSecondary}>Me</span>
        </div>
      </div>
      <div className={s.actions}>
        {showCredits ? (
          <button type="button" className={s.pill} onClick={onCreditsClick}>
            <SparklesIcon aria-hidden="true" className={s.pillIcon} />
            <span className={s.pillLabel}>
              {credits > 0 ? credits : 'Get Credits'}
            </span>
          </button>
        ) : null}
        {showUpgrade ? (
          <button
            type="button"
            className={s.upgradeButton}
            onClick={onUpgradeClick}
          >
            <SparklesIcon aria-hidden="true" />
            <span>Upgrade</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
