import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getGirls } from '@/api/girls';
import type { ICharacter } from '@/common/types';
import { cn } from '@/common/utils';

import s from './ExplorePage.module.scss';

const moods = ['Caring', 'Spicy', 'Playful', 'Intellectual'] as const;
const filterIds = ['All', ...moods] as const;

function getMood(character: ICharacter) {
  const score = [...character.name].reduce(
    (total, letter) => total + letter.charCodeAt(0),
    0,
  );

  return moods[score % moods.length];
}

function getCardImage(character: ICharacter) {
  return character.promoImgUrl ?? character.avatarUrl;
}

export function ExplorePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof filterIds)[number]>('All');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const {
    data: girls = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['girls'],
    queryFn: getGirls,
    select: (data) => [...data].sort((a, b) => a.name.localeCompare(b.name)),
  });

  const filteredGirls = useMemo(() => {
    return girls.filter((girl) => {
      const searchHaystack = [
        girl.name,
        girl.description,
        ...(girl.scenarios ?? []).flatMap((scenario) => [
          scenario.name,
          scenario.shortDescription,
        ]),
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = deferredQuery.length === 0 || searchHaystack.includes(deferredQuery);
      const matchesFilter =
        activeFilter === 'All' ? true : getMood(girl) === activeFilter;

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, deferredQuery, girls]);

  const stories = filteredGirls.slice(0, 6);
  const heroGirl = filteredGirls[0];
  const gridGirls = heroGirl ? filteredGirls.slice(1) : filteredGirls;

  const openCompanion = (girlId: string) => {
    navigate(`/companions/${girlId}`);
  };

  if (isLoading) {
    return <div className={s.empty}>Composing your midnight gallery...</div>;
  }

  if (isError) {
    return (
      <div className={s.empty}>
        {error instanceof Error ? error.message : 'Failed to load companions'}
      </div>
    );
  }

  return (
    <div className={s.page}>
      <section className={s.storiesSection}>
        <div className={s.sectionLabel}>Live Moments</div>
        <div className={`${s.stories} app-hide-scrollbar`}>
          {stories.map((girl, index) => (
            <button
              key={girl.id}
              type="button"
              className={s.story}
              onClick={() => openCompanion(girl.id)}
            >
              <span
                className={cn(s.storyRing, [], {
                  [s.storyMuted]: index === 2,
                })}
              >
                <img src={girl.avatarUrl} alt={girl.name} className={s.storyImage} />
              </span>
              <span className={s.storyName}>{girl.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={s.filters}>
        <label className={s.search}>
          <span className={`material-symbols-outlined ${s.searchIcon}`}>search</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={s.searchInput}
            placeholder="Discover your companion..."
          />
        </label>

        <div className={`${s.chips} app-hide-scrollbar`}>
          {filterIds.map((filterId) => (
            <button
              key={filterId}
              type="button"
              className={cn(s.chip, [], { [s.chipActive]: filterId === activeFilter })}
              onClick={() => setActiveFilter(filterId)}
            >
              {filterId}
            </button>
          ))}
        </div>
      </section>

      {filteredGirls.length === 0 ? (
        <div className={s.empty}>No companions match this mood yet.</div>
      ) : (
        <section className={s.grid}>
          {heroGirl ? (
            <button
              type="button"
              className={s.heroCard}
              onClick={() => openCompanion(heroGirl.id)}
            >
              <img src={getCardImage(heroGirl)} alt={heroGirl.name} className={s.cardImage} />
              <div className={s.cardOverlay} />
              <div className={s.cardBody}>
                <span className={s.eyebrow}>New Aura</span>
                <div className={s.heroFooter}>
                  <div className={s.info}>
                    <h2 className={`${s.cardTitle} ${s.heroTitle}`}>{heroGirl.name}</h2>
                    <p className={s.cardDescription}>{heroGirl.description}</p>
                  </div>
                  <span className={s.primaryAction}>Chat</span>
                </div>
              </div>
            </button>
          ) : null}

          {gridGirls.map((girl, index) => {
            const isWide = index > 1 && index % 3 === 2;
            const cardClassName = isWide ? s.wideTile : s.tile;

            return (
              <button
                key={girl.id}
                type="button"
                className={cardClassName}
                onClick={() => openCompanion(girl.id)}
              >
                <img src={getCardImage(girl)} alt={girl.name} className={s.cardImage} />
                <div className={s.cardOverlay} />
                <div className={s.cardBody}>
                  <div className={s.tileFooter}>
                    <div>
                      <h3 className={s.cardTitle}>{girl.name}</h3>
                      <div className={s.mood}>{getMood(girl)}</div>
                    </div>
                    {isWide ? (
                      <div className={s.heroFooter}>
                        <p className={s.cardDescription}>{girl.description}</p>
                        <span className={s.iconAction}>
                          <span className={`material-symbols-outlined filled ${s.iconGlyph}`}>
                            auto_awesome
                          </span>
                        </span>
                      </div>
                    ) : (
                      <span className={s.secondaryAction}>View Aura</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
