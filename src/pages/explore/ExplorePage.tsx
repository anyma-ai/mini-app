import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { getGirls } from '@/api/girls';
import {
  getStories,
  type IStoriesResponse,
  markStorySeen,
} from '@/api/stories';
import { useCharacterTypeParam } from '@/common/hooks/useCharacterTypeParam';
import {
  CharacterPersonality,
  type ICharacter,
  type IStory,
  StoryType,
} from '@/common/types';
import { cn } from '@/common/utils';
import { CharacterTypeSwitch } from '@/components/noir';

import s from './ExplorePage.module.scss';

const personalityFilters = [
  { id: 'All', label: 'All' },
  { id: CharacterPersonality.Hot, label: 'Hot 🔥' },
  { id: CharacterPersonality.Playful, label: 'Playful 😏' },
  { id: CharacterPersonality.Devoted, label: 'Devoted 💕' },
] as const;
const PHOTO_STORY_DURATION_MS = 5_000;
const HOLD_THRESHOLD_MS = 180;
const SWIPE_THRESHOLD_PX = 48;
const SWIPE_CANCEL_HOLD_THRESHOLD_PX = 12;

function getCardImage(character: ICharacter) {
  return character.promoImgUrl ?? character.avatarUrl;
}

// function getCharacterEyebrow(character: ICharacter) {
//   if (character.scenarios.some((scenario) => scenario.isNew)) {
//     return {
//       label: 'New',
//       className: 'new',
//     } as const;
//   }
//
//   if (character.isFeatured) {
//     return {
//       label: 'Trending',
//       className: 'trending',
//     } as const;
//   }
//
//   return null;
// }

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

type StoryViewerOverlayProps = {
  group: StoryGroup;
  storyIndex: number;
  currentStory: IStory;
  onNavigateStory: (direction: 'next' | 'previous') => void;
  onNavigateGroup: (direction: 'next' | 'previous') => void;
  onClose: () => void;
};

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

function StoryViewerOverlay({
  group,
  storyIndex,
  currentStory,
  onNavigateStory,
  onNavigateGroup,
  onClose,
}: StoryViewerOverlayProps) {
  const [activeProgress, setActiveProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoProgressRafRef = useRef<number | null>(null);
  const videoProgressRafRef = useRef<number | null>(null);
  const photoElapsedMsRef = useRef(0);
  const photoLastTickRef = useRef<number | null>(null);
  const holdStartAtRef = useRef<number | null>(null);
  const holdStartXRef = useRef<number | null>(null);
  const holdStartYRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const gestureLayerRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    photoElapsedMsRef.current = 0;
    photoLastTickRef.current = null;
    setActiveProgress(0);
  }, [currentStory.id]);

  useEffect(() => {
    return () => {
      if (photoProgressRafRef.current != null) {
        window.cancelAnimationFrame(photoProgressRafRef.current);
        photoProgressRafRef.current = null;
      }

      if (videoProgressRafRef.current != null) {
        window.cancelAnimationFrame(videoProgressRafRef.current);
        videoProgressRafRef.current = null;
      }

      if (holdTimeoutRef.current != null) {
        window.clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (currentStory.type !== StoryType.Photo) {
      return;
    }

    if (photoProgressRafRef.current != null) {
      window.cancelAnimationFrame(photoProgressRafRef.current);
      photoProgressRafRef.current = null;
    }

    if (isPaused) {
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

        const nextProgress = Math.min(
          photoElapsedMsRef.current / PHOTO_STORY_DURATION_MS,
          1,
        );
        setActiveProgress(nextProgress);

        if (nextProgress >= 1) {
          onNavigateStory('next');
          return;
        }
      }

      photoProgressRafRef.current = window.requestAnimationFrame(tick);
    };

    photoProgressRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (photoProgressRafRef.current != null) {
        window.cancelAnimationFrame(photoProgressRafRef.current);
        photoProgressRafRef.current = null;
      }
    };
  }, [currentStory.id, currentStory.type, isPaused, onNavigateStory]);

  useEffect(() => {
    if (currentStory.type !== StoryType.Video || !videoRef.current) return;

    const video = videoRef.current;
    const cancelVideoProgress = () => {
      if (videoProgressRafRef.current != null) {
        window.cancelAnimationFrame(videoProgressRafRef.current);
        videoProgressRafRef.current = null;
      }
    };

    const syncVideoProgress = () => {
      const duration = video.duration;
      const nextProgress =
        Number.isFinite(duration) && duration > 0
          ? Math.min(video.currentTime / duration, 1)
          : 0;

      setActiveProgress(nextProgress);
    };

    const startVideoProgress = () => {
      cancelVideoProgress();

      const tick = () => {
        syncVideoProgress();

        if (!video.paused && !video.ended) {
          videoProgressRafRef.current = window.requestAnimationFrame(tick);
        }
      };

      videoProgressRafRef.current = window.requestAnimationFrame(tick);
    };

    const handleEnded = () => {
      syncVideoProgress();
      cancelVideoProgress();
      onNavigateGroup('next');
    };

    const handleLoadedMetadata = () => {
      syncVideoProgress();

      if (!isPaused && !video.paused) {
        startVideoProgress();
      }
    };

    const handleTimeUpdate = () => {
      syncVideoProgress();
    };

    const handlePlay = () => {
      startVideoProgress();
    };

    const handlePause = () => {
      cancelVideoProgress();
      syncVideoProgress();
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    syncVideoProgress();

    if (!isPaused && !video.paused) {
      startVideoProgress();
    }

    return () => {
      cancelVideoProgress();
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [currentStory.id, currentStory.type, isPaused, onNavigateGroup]);

  useEffect(() => {
    if (currentStory.type !== StoryType.Video || !videoRef.current) return;

    if (isPaused) {
      videoRef.current.pause();
      return;
    }

    void videoRef.current.play().catch(() => {});
  }, [currentStory.id, currentStory.type, isPaused]);

  const resetGesture = () => {
    if (holdTimeoutRef.current != null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    holdStartAtRef.current = null;
    holdStartXRef.current = null;
    holdStartYRef.current = null;
    pointerIdRef.current = null;
  };

  const handleStoryGestureStart = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (pointerIdRef.current != null) return;

    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    holdStartAtRef.current = Date.now();
    holdStartXRef.current = event.clientX;
    holdStartYRef.current = event.clientY;

    holdTimeoutRef.current = window.setTimeout(() => {
      setIsPaused(true);
    }, HOLD_THRESHOLD_MS);
  };

  const handleStoryGestureMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const startX = holdStartXRef.current;
    const startY = holdStartYRef.current;
    if (startX == null || startY == null) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (
      holdTimeoutRef.current != null &&
      Math.abs(deltaX) > SWIPE_CANCEL_HOLD_THRESHOLD_PX &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  const handleStoryGestureEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);

    const pressStartedAt = holdStartAtRef.current;
    const startX = holdStartXRef.current;
    const startY = holdStartYRef.current;
    const wasPaused = isPaused;
    const endX = event.clientX;
    const endY = event.clientY;

    resetGesture();

    if (wasPaused) {
      setIsPaused(false);
    }

    if (pressStartedAt == null || startX == null) return;

    const durationMs = Date.now() - pressStartedAt;
    const deltaX = endX - startX;
    const deltaY = startY == null ? 0 : endY - startY;

    if (
      Math.abs(deltaX) >= SWIPE_THRESHOLD_PX &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      onNavigateGroup(deltaX < 0 ? 'next' : 'previous');
      return;
    }

    if (durationMs < HOLD_THRESHOLD_MS) {
      const bounds = gestureLayerRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const relativeX = startX - bounds.left;
      const direction = relativeX < bounds.width / 2 ? 'previous' : 'next';
      onNavigateStory(direction);
      return;
    }
  };

  const handleStoryGestureCancel = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (pointerIdRef.current !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const wasPaused = isPaused;
    resetGesture();

    if (wasPaused) {
      setIsPaused(false);
    }
  };

  return (
    <div className={s.storyViewerContent}>
      <div className={s.storyProgress}>
        {group.stories.map((story, index) => {
          const progress =
            index < storyIndex ? 1 : index === storyIndex ? activeProgress : 0;

          return (
            <span key={story.id} className={s.storyProgressTrack}>
              <span
                className={s.storyProgressFill}
                style={{
                  transform: `scaleX(${progress})`,
                }}
              />
            </span>
          );
        })}
      </div>

      <div className={s.storyViewerHeader}>
        <div className={s.storyViewerMeta}>
          <img
            src={group.avatarUrl}
            alt={group.characterName}
            className={s.storyViewerAvatar}
          />
          <div className={s.storyViewerName}>{group.characterName}</div>
        </div>

        <button type="button" className={s.storyViewerClose} onClick={onClose}>
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
            preload="auto"
            playsInline
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
        onPointerMove={handleStoryGestureMove}
        onPointerUp={handleStoryGestureEnd}
        onPointerCancel={handleStoryGestureCancel}
      />
    </div>
  );
}

export function ExplorePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { characterType, setCharacterType } = useCharacterTypeParam();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] =
    useState<(typeof personalityFilters)[number]['id']>('All');
  const [storyViewer, setStoryViewer] = useState<StoryViewerState>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const pendingSeenIdsRef = useRef(new Set<string>());
  const storyGroupsRef = useRef<StoryGroup[]>([]);

  const {
    data: girls = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['girls', characterType],
    queryFn: () => getGirls(characterType),
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
      storyGroups.find(
        (group) => group.characterId === storyViewer.characterId,
      ) ?? null
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

      const matchesQuery =
        deferredQuery.length === 0 || searchHaystack.includes(deferredQuery);
      const matchesFilter =
        activeFilter === 'All'
          ? true
          : (girl.personality ?? []).includes(activeFilter);

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, deferredQuery, girls]);

  const heroGirl =
    filteredGirls.find((girl) => girl.isFeatured) ?? filteredGirls[0];
  const gridGirls = heroGirl
    ? filteredGirls.filter((girl) => girl.id !== heroGirl.id)
    : filteredGirls;
  // const heroEyebrow = heroGirl ? getCharacterEyebrow(heroGirl) : null;

  const openCompanion = (girlId: string) => {
    navigate({
      pathname: `/companions/${girlId}`,
      search: `?type=${characterType}`,
    });
  };

  useEffect(() => {
    storyGroupsRef.current = storyGroups;
  }, [storyGroups]);

  const openStoryGroup = (group: StoryGroup) => {
    const firstUnseenIndex = group.stories.findIndex(
      (story) => !seenStoryIds.has(story.id),
    );
    const initialStoryIndex = firstUnseenIndex >= 0 ? firstUnseenIndex : 0;

    setStoryViewer({
      characterId: group.characterId,
      storyIndex: initialStoryIndex,
    });
  };

  const moveStory = useCallback((direction: 'next' | 'previous') => {
    setStoryViewer((current) => {
      if (!current) return current;

      const groups = storyGroupsRef.current;
      const groupIndex = groups.findIndex(
        (group) => group.characterId === current.characterId,
      );
      if (groupIndex < 0) return null;

      const group = groups[groupIndex];
      if (direction === 'next') {
        if (current.storyIndex < group.stories.length - 1) {
          return { ...current, storyIndex: current.storyIndex + 1 };
        }

        const nextGroup = groups[groupIndex + 1];
        if (!nextGroup) return null;

        return {
          characterId: nextGroup.characterId,
          storyIndex: 0,
        };
      }

      if (current.storyIndex > 0) {
        return { ...current, storyIndex: current.storyIndex - 1 };
      }

      const previousGroup = groups[groupIndex - 1];
      if (!previousGroup) return null;

      return {
        characterId: previousGroup.characterId,
        storyIndex: previousGroup.stories.length - 1,
      };
    });
  }, []);

  const moveStoryGroup = useCallback((direction: 'next' | 'previous') => {
    setStoryViewer((current) => {
      if (!current) return current;

      const groups = storyGroupsRef.current;
      const groupIndex = groups.findIndex(
        (group) => group.characterId === current.characterId,
      );
      if (groupIndex < 0) return current;

      const targetGroup =
        direction === 'next' ? groups[groupIndex + 1] : groups[groupIndex - 1];
      if (!targetGroup) return current;

      return {
        characterId: targetGroup.characterId,
        storyIndex: 0,
      };
    });
  }, []);

  useEffect(() => {
    if (!storyViewer) return;
    if (!currentGroup || !currentStory) {
      setStoryViewer(null);
      return;
    }
  }, [currentGroup, currentStory, storyViewer]);

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
    if (!storyViewer) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [Boolean(storyViewer)]);

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

      <CharacterTypeSwitch
        value={characterType}
        onChange={setCharacterType}
        className={s.typeSwitch}
      />

      <section className={s.filters}>
        <label className={s.search}>
          <span className={`material-symbols-outlined ${s.searchIcon}`}>
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={s.searchInput}
            placeholder="Discover your companion..."
          />
        </label>

        <div className={`${s.chips} app-hide-scrollbar`}>
          {personalityFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={cn(s.chip, [], {
                [s.chipActive]: filter.id === activeFilter,
              })}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {filteredGirls.length === 0 ? (
        <div className={s.empty}>No companions match this personality yet.</div>
      ) : (
        <section className={s.grid}>
          {heroGirl ? (
            <button
              type="button"
              className={s.heroCard}
              onClick={() => openCompanion(heroGirl.id)}
            >
              <img
                src={getCardImage(heroGirl)}
                alt={heroGirl.name}
                className={s.cardImage}
              />
              <div className={s.cardOverlay} />
              <div className={s.cardBody}>
                {/*{heroEyebrow ? (*/}
                {/*  <span*/}
                {/*    className={cn(s.eyebrow, [], {*/}
                {/*      [s.eyebrowTrending]: heroEyebrow.className === 'trending',*/}
                {/*    })}*/}
                {/*  >*/}
                {/*    {heroEyebrow.label}*/}
                {/*  </span>*/}
                {/*) : null}*/}
                <div className={s.heroFooter}>
                  <div className={s.info}>
                    <h2 className={`${s.cardTitle} ${s.heroTitle}`}>
                      {heroGirl.name}
                    </h2>
                    <p className={s.cardDescription}>{heroGirl.description}</p>
                  </div>
                  <span className={s.primaryAction}>Chat</span>
                </div>
              </div>
            </button>
          ) : null}

          {gridGirls.map((girl) => {
            return (
              <button
                key={girl.id}
                type="button"
                className={s.tile}
                onClick={() => openCompanion(girl.id)}
              >
                <img
                  src={getCardImage(girl)}
                  alt={girl.name}
                  className={s.cardImage}
                />
                <div className={s.cardOverlay} />
                <div className={s.cardBody}>
                  <div className={s.tileFooter}>
                    <div>
                      <h3 className={s.cardTitle}>{girl.name}</h3>
                      <div className={s.mood}>{girl.description}</div>
                    </div>
                    <span className={s.secondaryAction}>Chat Now</span>
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
              <StoryViewerOverlay
                key={currentStory.id}
                group={currentGroup}
                storyIndex={storyViewer.storyIndex}
                currentStory={currentStory}
                onNavigateStory={moveStory}
                onNavigateGroup={moveStoryGroup}
                onClose={() => setStoryViewer(null)}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
