import { useNavigate } from 'react-router-dom';

import userAvatar from '@/assets/mini/user-avatar.png';
import { useUser } from '@/context/UserContext';

import s from './ProfilePage.module.scss';

function formatSince(createdAt?: string) {
  if (!createdAt) return 'Since recently';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Since recently';

  return `Since ${new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(date)}`;
}

function formatSubscriptionDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getDisplayName(firstName?: string, lastName?: string) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || 'Aura Seeker';
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading, error } = useUser();

  if (isLoading) {
    return <div className={s.empty}>Curating your private profile...</div>;
  }

  if (error) {
    return <div className={s.empty}>{error}</div>;
  }

  const displayName = getDisplayName(user?.firstName, user?.lastName);
  const subscriptionDate = formatSubscriptionDate(user?.subscribedUntil);
  const premiumLabel = user?.isSubscribed ? 'Upgrade Premium' : 'Get Premium';
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
          <p className={s.meta}>{formatSince(user?.createdAt)}</p>
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
            <div className={s.statLabel}>Credits</div>
          </div>
          <button
            type="button"
            className={s.statButton}
            onClick={() => navigate('/shop')}
          >
            Buy Credits
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
            <div className={s.statLabel}>Energy</div>
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

      <section className={s.premiumCard}>
        <div className={s.premiumTop}>
          <div className={s.premiumCopy}>
            <h2 className={s.premiumTitle}>SweetMe Premium</h2>
            <p className={s.premiumSubtitle}>
              {user?.isSubscribed && subscriptionDate
                ? `Active until ${subscriptionDate}`
                : 'Just one step from Special & Unforgettable experience'}
            </p>
          </div>

          <div
            className={`${s.premiumStatus} ${user?.isSubscribed ? s.statusActive : s.statusIdle}`}
          >
            {user?.isSubscribed ? 'Active' : 'Premium'}
          </div>
        </div>

        <div className={s.premiumStrip}>
          <div className={s.premiumStripIcon}>
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div className={s.premiumStripCopy}>
            <p className={s.premiumStripTitle}>SweetMe expands with Premium</p>
            <p className={s.premiumStripText}>
              Unlimited energy, exclusive moments, and a deeper private
              experience.
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
    </div>
  );
}
