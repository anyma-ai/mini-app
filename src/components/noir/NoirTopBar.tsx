import { useNavigate } from 'react-router-dom';

import { cn } from '@/common/utils';

import s from './NoirTopBar.module.scss';

type NoirTopBarProps = {
  mode?: 'brand' | 'back';
  title?: string;
  avatarSrc?: string;
  credits?: number;
  creditsLabel?: string;
  onCreditsClick?: () => void;
  onBack?: () => void;
};

export function NoirTopBar({
  mode = 'brand',
  title,
  avatarSrc,
  credits = 0,
  creditsLabel = 'Credits',
  onCreditsClick,
  onBack,
}: NoirTopBarProps) {
  const navigate = useNavigate();

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
        <div className={s.wordmark}>SweetMe</div>
      </div>
      <button type="button" className={s.pill} onClick={onCreditsClick}>
        <span className={cn('material-symbols-outlined filled', [s.pillIcon])}>
          auto_awesome
        </span>
        <span className={s.pillLabel}>
          {credits} {creditsLabel}
        </span>
      </button>
    </header>
  );
}
