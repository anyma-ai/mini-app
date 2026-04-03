import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { getGirls } from '@/api/girls';
import { getStories, markStorySeen, type IStoriesResponse } from '@/api/stories';
import type { ICharacter, IStory } from '@/common/types';
import { StoryType } from '@/common/types';
import { cn } from '@/common/utils';

import s from './ExplorePage.module.scss';

const moods = ['Caring', 'Spicy', 'Playful', 'Intellectual'] as const;
const filterIds = ['All', ...moods] as const;
const PHOTO_STORY_DURATION_MS = 5_000;
const HOLD_THRESHOLD_MS = 180;

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

type StoryGroup = {
  characterId: string;
  characterName: string;
  avatarUrl: string;
  stories: IStory[];
};

type StoryViewerState = {
  characterId: string;
  storyIndex: number;
} | null;

function getAdjacentStory(
  groups: StoryGroup[],
  viewer: StoryViewerState,
  direction: 'next' | 'previous',
): IStory | null {
  if (!viewer) return null;

  const groupIndex = groups.findIndex(
    (group) => group.characterId === viewer.characterId,
  );
  if (groupIndex < 0) return null;

  const group = groups[groupIndex];
  if (direction === 'next') {
    if (viewer.storyIndex < group.stories.length - 1) {
      return group.stories[viewer.storyIndex + 1] ?? null;
    }

    return groups[groupIndex + 1]?.stories[0] ?? null;
  }

  if (viewer.storyIndex > 0) {
    return group.stories[viewer.storyIndex - 1] ?? null;
  }

  const previousGroup = groups[groupIndex - 1];
  return previousGroup?.stories[previousGroup.stories.length - 1] ?? null;
}

export function ExplorePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof filterIds)[number]>('All');
  const [storyViewer, setStoryViewer] = useState<StoryViewerState>(null);
  const [storyDurationMs, setStoryDurationMs] = useState(PHOTO_STORY_DURATION_MS);
  const [activeProgress, setActiveProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingSeenIdsRef = useRef(new Set<string>());
  const progressRafRef = useRef<number | null>(null);
  const photoElapsedMsRef = useRef(0);
  const photoLastTickRef = useRef<number | null>(null);
  const holdStartAtRef = useRef<number | null>(null);
  const holdStartXRef = useRef<number | null>(null);
  const gestureLayerRef = useRef<HTMLDivElement | null>(null);

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

  const { data: storiesData } = useQuery({
    queryKey: ['stories'],
    queryFn: getStories,
    staleTime: 30_000,
  });

  const girlsById = useMemo(
    () => new Map(girls.map((girl) => [girl.id, girl])),
    [girls],
  );

  const seenStoryIds = useMemo(
    () => new Set(storiesData?.seenStories ?? []),
    [storiesData?.seenStories],
  );

  const storyGroups = useMemo(() => {
    const groups = new Map<string, StoryGroup>();

    (storiesData?.stories ?? []).forEach((story) => {
      const girl = girlsById.get(story.characterId);
      if (!girl) return;

      const existingGroup = groups.get(story.characterId);
      if (existingGroup) {
        existingGroup.stories.push(story);
        return;
      }

      groups.set(story.characterId, {
        characterId: story.characterId,
        characterName: girl.name,
        avatarUrl: girl.avatarUrl,
        stories: [story],
      });
    });

    return [...groups.values()].map((group) => ({
      ...group,
      stories: [...group.stories].sort((a, b) => a.idx - b.idx),
    }));
  }, [girlsById, storiesData?.stories]);

  const currentGroup = useMemo(() => {
    if (!storyViewer) return null;
    return (
      storyGroups.find((group) => group.characterId === storyViewer.characterId) ??
      null
    );
  }, [storyGroups, storyViewer]);

  const currentStory = useMemo(() => {
    if (!currentGroup || !storyViewer) return null;
    return currentGroup.stories[storyViewer.storyIndex] ?? null;
  }, [currentGroup, storyViewer]);

  const nextStory = useMemo(
    () => getAdjacentStory(storyGroups, storyViewer, 'next'),
    [storyGroups, storyViewer],
  );

  const nextGroupFirstStory = useMemo(() => {
    if (!storyViewer) return null;

    const currentGroupIndex = storyGroups.findIndex(
      (group) => group.characterId === storyViewer.characterId,
    );
    if (currentGroupIndex < 0) return null;

    return storyGroups[currentGroupIndex + 1]?.stories[0] ?? null;
  }, [storyGroups, storyViewer]);

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

  const heroGirl = filteredGirls[0];
  const gridGirls = heroGirl ? filteredGirls.slice(1) : filteredGirls;

  const openCompanion = (girlId: string) => {
    navigate(`/companions/${girlId}`);
  };

  const openStoryGroup = (group: StoryGroup) => {
    const firstUnseenIndex = group.stories.findIndex(
      (story) => !seenStoryIds.has(story.id),
    );

    setStoryViewer({
      characterId: group.characterId,
      storyIndex: firstUnseenIndex >= 0 ? firstUnseenIndex : 0,
    });
    setStoryDurationMs(PHOTO_STORY_DURATION_MS);
    setActiveProgress(0);
    setIsPaused(false);
  };

  const moveStory = (direction: 'next' | 'previous') => {
    setStoryViewer((current) => {
      if (!current) return current;

      const groupIndex = storyGroups.findIndex(
        (group) => group.characterId === current.characterId,
      );
      if (groupIndex < 0) return null;

      const group = storyGroups[groupIndex];
      if (direction === 'next') {
        if (current.storyIndex < group.stories.length - 1) {
          return { ...current, storyIndex: current.storyIndex + 1 };
        }

        const nextGroup = storyGroups[groupIndex + 1];
        if (!nextGroup) return null;

        return {
          characterId: nextGroup.characterId,
          storyIndex: 0,
        };
      }

      if (current.storyIndex > 0) {
        return { ...current, storyIndex: current.storyIndex - 1 };
      }

      const previousGroup = storyGroups[groupIndex - 1];
      if (!previousGroup) return null;

      return {
        characterId: previousGroup.characterId,
        storyIndex: previousGroup.stories.length - 1,
      };
    });
  };

  useEffect(() => {
    if (!storyViewer) return;
    if (!currentGroup || !currentStory) {
      setStoryViewer(null);
      return;
    }
  }, [currentGroup, currentStory, storyViewer]);

  useEffect(() => {
    if (!currentStory) return;

    setStoryDurationMs(
      currentStory.type === StoryType.Photo ? PHOTO_STORY_DURATION_MS : 12_000,
    );
    setActiveProgress(0);
    photoElapsedMsRef.current = 0;
    photoLastTickRef.current = null;
  }, [currentStory]);

  useEffect(() => {
    if (progressRafRef.current != null) {
      window.cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }

    if (!storyViewer || !currentStory || isPaused) {
      photoLastTickRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (currentStory.type === StoryType.Photo) {
        if (photoLastTickRef.current == null) {
          photoLastTickRef.current = timestamp;
        }

        photoElapsedMsRef.current += timestamp - photoLastTickRef.current;
        photoLastTickRef.current = timestamp;

        const nextProgress = Math.min(photoElapsedMsRef.current / storyDurationMs, 1);
        setActiveProgress(nextProgress);

        if (nextProgress >= 1) {
          moveStory('next');
          return;
        }
      } else if (videoRef.current) {
        const duration = videoRef.current.duration * 1000;
        if (!Number.isNaN(duration) && duration > 0) {
          setActiveProgress(
            Math.min((videoRef.current.currentTime * 1000) / duration, 1),
          );
        }
      }

      progressRafRef.current = window.requestAnimationFrame(tick);
    };

    progressRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (progressRafRef.current != null) {
        window.cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
  }, [currentStory, isPaused, storyDurationMs, storyViewer]);

  useEffect(() => {
    if (!currentStory) return;
    if (seenStoryIds.has(currentStory.id)) return;
    if (pendingSeenIdsRef.current.has(currentStory.id)) return;

    pendingSeenIdsRef.current.add(currentStory.id);
    queryClient.setQueryData<IStoriesResponse | undefined>(
      ['stories'],
      (current) => {
        if (!current || current.seenStories.includes(currentStory.id)) {
          return current;
        }

        return {
          ...current,
          seenStories: [...current.seenStories, currentStory.id],
        };
      },
    );

    void markStorySeen(currentStory.id)
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        pendingSeenIdsRef.current.delete(currentStory.id);
      });
  }, [currentStory, queryClient, seenStoryIds]);

  useEffect(() => {
    if (!videoRef.current || !currentStory || currentStory.type !== StoryType.Video) {
      return;
    }

    if (isPaused) {
      videoRef.current.pause();
      return;
    }

    void videoRef.current.play().catch(() => {});
  }, [currentStory, isPaused]);

  useEffect(() => {
    if (!storyViewer) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [storyViewer]);

  useEffect(() => {
    if (!nextStory) return;

    if (nextStory.type === StoryType.Photo) {
      const image = new Image();
      image.src = nextStory.fileUrl;
      return;
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.src = nextStory.fileUrl;
    video.load();
  }, [nextStory]);

  useEffect(() => {
    if (!nextGroupFirstStory) return;
    if (nextStory?.id === nextGroupFirstStory.id) return;

    if (nextGroupFirstStory.type === StoryType.Photo) {
      const image = new Image();
      image.src = nextGroupFirstStory.fileUrl;
      return;
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.src = nextGroupFirstStory.fileUrl;
    video.load();
  }, [nextGroupFirstStory, nextStory]);

  const handleStoryGestureStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    holdStartAtRef.current = Date.now();
    holdStartXRef.current = event.clientX;
    setIsPaused(true);
  };

  const handleStoryGestureEnd = () => {
    const pressStartedAt = holdStartAtRef.current;
    const startX = holdStartXRef.current;
    holdStartAtRef.current = null;
    holdStartXRef.current = null;
    setIsPaused(false);

    if (pressStartedAt == null || startX == null) return;

    if (Date.now() - pressStartedAt < HOLD_THRESHOLD_MS) {
      const bounds = gestureLayerRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const relativeX = startX - bounds.left;
      const direction = relativeX < bounds.width / 2 ? 'previous' : 'next';
      moveStory(direction);
    }
  };

  const handleStoryGestureCancel = () => {
    holdStartAtRef.current = null;
    holdStartXRef.current = null;
    setIsPaused(false);
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
      {storyGroups.length > 0 ? (
        <section className={s.storiesSection}>
          <div className={s.sectionLabel}>Live Moments</div>
          <div className={`${s.stories} app-hide-scrollbar`}>
            {storyGroups.map((group) => {
              const hasUnseenStory = group.stories.some(
                (story) => !seenStoryIds.has(story.id),
              );

              return (
                <button
                  key={group.characterId}
                  type="button"
                  className={s.story}
                  onClick={() => openStoryGroup(group)}
                >
                  <span
                    className={cn(s.storyRing, [], {
                      [s.storyMuted]: !hasUnseenStory,
                    })}
                  >
                    <img
                      src={group.avatarUrl}
                      alt={group.characterName}
                      className={s.storyImage}
                    />
                  </span>
                  <span className={s.storyName}>{group.characterName}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

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

      {storyViewer && currentGroup && currentStory
        ? createPortal(
            <div className={s.storyViewer}>
              <div className={s.storyViewerBackdrop} />

              <div className={s.storyViewerContent}>
                <div className={s.storyProgress}>
                  {currentGroup.stories.map((story, index) => {
                    const isSeen = index < storyViewer.storyIndex;
                    const isCurrent = index === storyViewer.storyIndex;
                    const width = isSeen ? '100%' : isCurrent ? `${activeProgress * 100}%` : '0%';

                    return (
                      <span key={story.id} className={s.storyProgressTrack}>
                        <span
                          className={cn(s.storyProgressFill, [], {
                            [s.storyProgressSeen]: isSeen,
                          })}
                          style={{ width }}
                        />
                      </span>
                    );
                  })}
                </div>

                <div className={s.storyViewerHeader}>
                  <div className={s.storyViewerMeta}>
                    <img
                      src={currentGroup.avatarUrl}
                      alt={currentGroup.characterName}
                      className={s.storyViewerAvatar}
                    />
                    <div className={s.storyViewerName}>{currentGroup.characterName}</div>
                  </div>

                  <button
                    type="button"
                    className={s.storyViewerClose}
                    onClick={() => setStoryViewer(null)}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className={s.storyMedia}>
                  {currentStory.type === StoryType.Video ? (
                    <video
                      key={currentStory.id}
                      ref={videoRef}
                      src={currentStory.fileUrl}
                      className={s.storyMediaAsset}
                      autoPlay
                      muted
                      playsInline
                      onLoadedMetadata={(event) => {
                        const durationMs = event.currentTarget.duration * 1000;
                        if (!Number.isNaN(durationMs) && durationMs > 0) {
                          setStoryDurationMs(durationMs);
                        }
                      }}
                      onEnded={() => moveStory('next')}
                    />
                  ) : (
                    <img
                      key={currentStory.id}
                      src={currentStory.fileUrl}
                      alt=""
                      className={s.storyMediaAsset}
                    />
                  )}
                </div>

                <div
                  ref={gestureLayerRef}
                  className={s.storyGestureLayer}
                  onPointerDown={handleStoryGestureStart}
                  onPointerUp={handleStoryGestureEnd}
                  onPointerCancel={handleStoryGestureCancel}
                  onPointerLeave={handleStoryGestureCancel}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
