import { useQuery } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { getGirls } from '@/api/girls';
import type { IScenario } from '@/common/types';
import { cn } from '@/common/utils';

import s from './MagicPage.module.scss';

function parseDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function MagicPage() {
  const navigate = useNavigate();
  const {
    data: girls = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['girls'],
    queryFn: getGirls,
  });

  const scenarioEntries = useMemo(() => {
    return girls
      .flatMap((girl) =>
        (girl.scenarios ?? []).map((scenario) => ({
          girl,
          scenario,
        })),
      )
      .sort((a, b) => {
        if (a.scenario.isActive !== b.scenario.isActive) {
          return a.scenario.isActive ? -1 : 1;
        }

        return (
          parseDate(b.scenario.createdAt) - parseDate(a.scenario.createdAt)
        );
      });
  }, [girls]);

  const activeEntries = scenarioEntries.filter(
    (entry) => entry.scenario.isActive,
  );
  const lockedEntry = scenarioEntries.find((entry) => !entry.scenario.isActive);

  const openScenario = (scenario: IScenario) => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME;

    if (!botUsername || !scenario.slug) {
      return;
    }

    TelegramWebApp.openTelegramLink(
      `https://t.me/${botUsername}?start=s_${scenario.slug}`,
    );
    TelegramWebApp.close();
  };

  if (isLoading) {
    return <div className={s.empty}>Curating your immersive paths...</div>;
  }

  if (isError) {
    return (
      <div className={s.empty}>
        {error instanceof Error ? error.message : 'Failed to load scenarios'}
      </div>
    );
  }

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1 className={s.title}>Choose Your Path</h1>
        <p className={s.description}>
          Step into a curated reality where every choice shapes the intimacy of
          the story you enter next.
        </p>
      </section>

      <div className={s.stack}>
        {activeEntries.slice(0, 3).map(({ scenario }) => (
          <section key={scenario.id} className={s.card}>
            <img
              src={scenario.promoImgUrl}
              alt={scenario.name}
              className={s.cardImage}
            />
            <div className={s.cardOverlay} />
            <div className={s.cardBody}>
              <div className={s.metaRow}>
                <span
                  className={cn(s.badge, [], {
                    [s.badgeSecondary]: !scenario.isNew,
                  })}
                >
                  {scenario.isNew ? 'New Release' : 'Trending'}
                </span>
              </div>

              <div>
                <h2 className={s.heading}>{scenario.name}</h2>
                <p className={s.copy}>
                  {scenario.shortDescription || scenario.description}
                </p>
              </div>

              <button
                type="button"
                className={s.footerButton}
                onClick={() => openScenario(scenario)}
              >
                Start Scenario
              </button>
            </div>
          </section>
        ))}

        {lockedEntry ? (
          <section className={s.lockedCard}>
            <img
              src={lockedEntry.scenario.promoImgHorizontalUrl}
              alt=""
              className={s.lockedImage}
            />
            <div className={s.lockedBlur} />
            <div className={s.lockedBody}>
              <div className={s.lockOrb}>
                <span
                  className={`material-symbols-outlined filled ${s.lockIcon}`}
                >
                  lock
                </span>
              </div>
              <div>
                <h2 className={s.lockedTitle}>Unlock Deep Intimacy</h2>
                <p className={s.lockedCopy}>Available for Premium Members</p>
              </div>
              <button
                type="button"
                className={s.footerButton}
                onClick={() => navigate('/subscriptions')}
              >
                Upgrade Now
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
