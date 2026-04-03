import { useQuery } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getGirls } from '@/api/girls';
import type { IScenario } from '@/common/types';

import s from './CompanionPage.module.scss';

function parseDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function CompanionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    data: girls = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['girls'],
    queryFn: () => getGirls(),
  });

  const companion = useMemo(
    () => girls.find((girl) => girl.id === id),
    [girls, id],
  );

  const scenarios = useMemo(() => {
    if (!companion?.scenarios) return [];
    return [...companion.scenarios].sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return parseDate(b.createdAt) - parseDate(a.createdAt);
    });
  }, [companion]);

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
    return <div className={s.empty}>Inviting your companion into focus...</div>;
  }

  if (isError) {
    return (
      <div className={s.empty}>
        {error instanceof Error ? error.message : 'Failed to load companion'}
      </div>
    );
  }

  if (!companion) {
    return <div className={s.empty}>This aura is no longer available.</div>;
  }

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <img
          src={companion.promoImgUrl ?? companion.avatarUrl}
          alt={companion.name}
          className={s.heroImage}
        />
        <div className={s.heroOverlay} />
        <div className={s.heroBody}>
          <span className={s.badge}>Scenarios</span>
          <div>
            <h1 className={s.name}>{companion.name}</h1>
            <p className={s.description}>{companion.description}</p>
          </div>
        </div>
      </section>

      <section className={s.stack}>
        <h2 className={s.sectionTitle}>Choose Your Path</h2>
        {scenarios.map((scenario) => (
          <article key={scenario.id} className={s.scenario}>
            <img
              src={scenario.promoImgHorizontalUrl || scenario.promoImgUrl}
              alt={scenario.name}
              className={s.scenarioImage}
            />
            <div className={s.scenarioOverlay} />
            <div className={s.scenarioBody}>
              <div>
                <h3 className={s.scenarioName}>{scenario.name}</h3>
                <p className={s.scenarioDescription}>
                  {scenario.shortDescription || scenario.description}
                </p>
              </div>
              <div className={s.actions}>
                {scenario.isActive ? (
                  <button
                    type="button"
                    className={s.action}
                    onClick={() => openScenario(scenario)}
                  >
                    Start Scenario
                  </button>
                ) : (
                  <button
                    type="button"
                    className={s.secondaryAction}
                    onClick={() => navigate('/subscriptions')}
                  >
                    Unlock Intimacy
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
