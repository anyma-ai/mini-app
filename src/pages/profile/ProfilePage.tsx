import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CheckIcon, GlobeIcon } from '@/assets/icons';
import userAvatar from '@/assets/mini/user-avatar.png';
import { useUser } from '@/context/UserContext';
import {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  SUPPORTED_UI_LANGUAGES,
  type SupportedLanguage,
} from '@/i18n/languages';
import { Modal } from '@/pages/create-character/ui';

import s from './ProfilePage.module.scss';

function formatSince(createdAt: string | undefined, language: string) {
  if (!createdAt) return null;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatSubscriptionDate(value: string | null | undefined, language: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getDisplayName(
  firstName: string | undefined,
  lastName: string | undefined,
  fallback: string,
) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || fallback;
}

function LanguageModal({
  currentLanguage,
  error,
  pendingLanguage,
  onClose,
  onSelect,
}: {
  currentLanguage: SupportedLanguage;
  error: string | null;
  pendingLanguage: SupportedLanguage | null;
  onClose: () => void;
  onSelect: (language: SupportedLanguage) => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open
      title={t('profile.selectLanguage')}
      onClose={onClose}
      contentClassName={s.languageModalContent}
    >
      <div className={s.languageList}>
        {SUPPORTED_UI_LANGUAGES.map((language) => {
          const option = LANGUAGE_OPTIONS[language];
          const active = currentLanguage === language;
          const pending = pendingLanguage === language;

          return (
            <button
              aria-pressed={active}
              className={`${s.languageOption} ${active ? s.languageOptionActive : ''}`}
              disabled={Boolean(pendingLanguage)}
              key={language}
              type="button"
              onClick={() => onSelect(language)}
            >
              <span className={s.languageInfo}>
                <span className={s.languageEmoji} aria-hidden="true">
                  {option.emoji}
                </span>
                <span>
                  <strong>{option.nativeLabel}</strong>
                  <small>{option.label}</small>
                </span>
              </span>
              <span className={s.languageCheck}>
                {pending ? '...' : active ? <CheckIcon aria-hidden="true" /> : ''}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className={s.languageError}>{error}</p> : null}
    </Modal>
  );
}

export function ProfilePage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading, error, updateLanguage } = useUser();
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] =
    useState<SupportedLanguage | null>(null);
  const [languageError, setLanguageError] = useState<string | null>(null);

  if (isLoading) {
    return <div className={s.empty}>{t('profile.curating')}</div>;
  }

  if (error) {
    return <div className={s.empty}>{error}</div>;
  }

  const currentLanguage = normalizeLanguage(user?.languageUI ?? i18n.language);
  const displayName = getDisplayName(
    user?.firstName,
    user?.lastName,
    t('profile.seekerName'),
  );
  const sinceDate = formatSince(user?.createdAt, i18n.language);
  const subscriptionDate = formatSubscriptionDate(
    user?.subscribedUntil,
    i18n.language,
  );
  const premiumLabel = user?.isSubscribed
    ? t('profile.upgradePremium')
    : t('profile.getPremium');
  const energyValue = user?.isSubscribed ? 100 : (user?.fuel ?? 0);
  const energyMax = 100;
  const energyProgress = Math.max(0, Math.min(energyValue / energyMax, 1));

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <div className={s.heroGlow} />
        <div className={s.avatarWrap}>
          <div className={s.avatarRing}>
            <img src={userAvatar} alt={displayName} className={s.avatar} />
          </div>
          {user?.isSubscribed ? <div className={s.proBadge}>PRO</div> : null}
        </div>

        <div className={s.identity}>
          <h1 className={s.name}>{displayName}</h1>
          <p className={s.meta}>
            {sinceDate
              ? t('profile.memberSince', { date: sinceDate })
              : t('profile.recently')}
          </p>
        </div>
      </section>

      <section className={s.statsGrid}>
        <article className={s.statCard}>
          <span
            className={`material-symbols-outlined ${s.statIcon} ${s.creditsIcon}`}
          >
            token
          </span>
          <div className={s.statBody}>
            <div className={s.statValue}>{user?.air ?? 0}</div>
            <div className={s.statLabel}>{t('common.credits')}</div>
          </div>
          <button
            type="button"
            className={s.statButton}
            onClick={() => navigate('/shop')}
          >
            {t('profile.buyCredits')}
          </button>
        </article>

        <article className={s.statCard}>
          <span
            className={`material-symbols-outlined ${s.statIcon} ${s.energyIcon}`}
          >
            local_fire_department
          </span>
          <div className={s.statBody}>
            <div className={s.statValue}>
              {user?.isSubscribed ? '∞' : energyValue}
            </div>
            <div className={s.statLabel}>{t('common.energy')}</div>
          </div>
          <div className={s.energyMeter}>
            <div className={s.energyTrack}>
              <div
                className={s.energyFill}
                style={{ transform: `scaleX(${energyProgress})` }}
              />
            </div>

            <div className={s.energyMeta}>
              <span>{energyValue}</span>
              {!user?.isSubscribed && <span>{energyMax}</span>}
            </div>
          </div>
        </article>
      </section>

      <section className={s.preferenceCard}>
        <button
          type="button"
          className={s.preferenceButton}
          onClick={() => {
            setLanguageError(null);
            setLanguageModalOpen(true);
          }}
        >
          <span className={s.preferenceIcon}>
            <GlobeIcon aria-hidden="true" />
          </span>
          <span className={s.preferenceCopy}>
            <strong>{t('profile.language')}</strong>
            <small>{t('profile.languageSubtitle')}</small>
          </span>
          <span className={s.preferenceValue}>
            <span aria-hidden="true">{LANGUAGE_OPTIONS[currentLanguage].emoji}</span>
            {LANGUAGE_OPTIONS[currentLanguage].nativeLabel}
          </span>
        </button>
      </section>

      <section className={s.premiumCard}>
        <div className={s.premiumTop}>
          <div className={s.premiumCopy}>
            <h2 className={s.premiumTitle}>{t('profile.premiumTitle')}</h2>
            <p className={s.premiumSubtitle}>
              {user?.isSubscribed && subscriptionDate
                ? t('profile.activeUntil', { date: subscriptionDate })
                : t('profile.premiumSubtitle')}
            </p>
          </div>

          <div
            className={`${s.premiumStatus} ${user?.isSubscribed ? s.statusActive : s.statusIdle}`}
          >
            {user?.isSubscribed ? t('common.active') : t('common.premium')}
          </div>
        </div>

        <div className={s.premiumStrip}>
          <div className={s.premiumStripIcon}>
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div className={s.premiumStripCopy}>
            <p className={s.premiumStripTitle}>{t('profile.stripTitle')}</p>
            <p className={s.premiumStripText}>
              {t('profile.stripText')}
            </p>
          </div>
        </div>

        <button
          type="button"
          className={s.premiumButton}
          onClick={() => navigate('/subscriptions')}
        >
          {premiumLabel}
        </button>
      </section>

      {languageModalOpen ? (
        <LanguageModal
          currentLanguage={currentLanguage}
          error={languageError}
          pendingLanguage={pendingLanguage}
          onClose={() => {
            if (!pendingLanguage) {
              setLanguageModalOpen(false);
            }
          }}
          onSelect={(language) => {
            if (language === currentLanguage) {
              setLanguageModalOpen(false);
              return;
            }

            setLanguageError(null);
            setPendingLanguage(language);
            void updateLanguage(language)
              .then(() => setLanguageModalOpen(false))
              .catch(() => setLanguageError(t('profile.saveLanguageError')))
              .finally(() => setPendingLanguage(null));
          }}
        />
      ) : null}
    </div>
  );
}
