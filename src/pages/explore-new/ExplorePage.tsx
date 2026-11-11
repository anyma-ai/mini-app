import { useQuery, useQueryClient } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import type { KeyboardEvent } from 'react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  getScenarios,
  scenarioKeys,
  type ScenarioListQuery,
} from '@/api/scenarios';
import {
  getStories,
  type IStoriesResponse,
  markStorySeen,
} from '@/api/stories';
import {
  CameraIcon,
  HeartIcon,
  MessageIcon,
  SparklesIcon,
} from '@/assets/icons';
import {
  CHARACTER_FILTER_PARAMS,
  CHARACTER_FILTER_TAG_LABELS,
  CharacterFilterTag,
} from '@/common/consts/character';
import { useCharacterTypeParam } from '@/common/hooks/useCharacterTypeParam';
import {
  CharacterType,
  type Paginated,
  type ScenarioListItem,
} from '@/common/types';
import { cn } from '@/common/utils';

import styles from './ExplorePage.module.scss';
import { ScenarioDetailsDrawer } from './ScenarioDetailsDrawer';
import {
  type ExploreStory,
  getCurrentStory,
  getInitialStoryIndex,
  groupStories,
  sortStoryGroupsByUnseen,
  type StoryGroup,
  type StoryViewerState,
} from './stories-model';
import { StoryViewer } from './StoryViewer';

const EXPLORE_SCENARIOS_QUERY = {
  skip: 0,
  take: 20,
};

const SCENARIO_FILTER_TAGS = Object.values(CharacterFilterTag);
const FINE_POINTER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';
const MOBILE_MEDIA_QUERY = '(max-width: 700px)';
const MOBILE_PREVIEW_PLAY_DELAY_MS = 50;
const MOBILE_PREVIEW_ACTIVE_LINE_RATIO = 0.5;
const MOBILE_PREVIEW_ROW_EPSILON_PX = 8;
const MOBILE_PREVIEW_ROW_SPLIT_HYSTERESIS_PX = 24;

function getScenarioImageUrl(scenario: ScenarioListItem) {
  return (
    scenario.promoImgUrl ||
    scenario.openingImageUrl ||
    scenario.character.avatarUrl
  );
}

function ScenarioCard({
  cardRef,
  isMobilePreviewActive,
  onOpen,
  scenario,
}: {
  cardRef: (node: HTMLElement | null) => void;
  isMobilePreviewActive: boolean;
  onOpen: (scenario: ScenarioListItem) => void;
  scenario: ScenarioListItem;
}) {
  const { t } = useTranslation();
  const [isMobilePreviewPlaying, setIsMobilePreviewPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isMobilePreviewActiveRef = useRef(isMobilePreviewActive);
  const wasMobilePreviewActiveRef = useRef(false);

  useEffect(() => {
    isMobilePreviewActiveRef.current = isMobilePreviewActive;
    const video = videoRef.current;

    if (!video) return undefined;

    if (isMobilePreviewActive) {
      wasMobilePreviewActiveRef.current = true;
      const playTimer = window.setTimeout(() => {
        void video.play().catch(() => {
          video.pause();
        });
      }, MOBILE_PREVIEW_PLAY_DELAY_MS);

      return () => {
        window.clearTimeout(playTimer);
      };
    }

    if (!wasMobilePreviewActiveRef.current) {
      return undefined;
    }

    wasMobilePreviewActiveRef.current = false;
    video.pause();
    video.currentTime = 0;
    return undefined;
  }, [isMobilePreviewActive]);

  const handlePointerEnter = () => {
    if (
      typeof window.matchMedia === 'function' &&
      !window.matchMedia(FINE_POINTER_MEDIA_QUERY).matches
    ) {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    void video.play().catch(() => {
      video.pause();
    });
  };

  const handlePointerLeave = () => {
    if (
      typeof window.matchMedia === 'function' &&
      !window.matchMedia(FINE_POINTER_MEDIA_QUERY).matches
    ) {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
  };

  const handleOpen = () => {
    onOpen(scenario);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    handleOpen();
  };

  return (
    <article
      aria-label={t('explore.aria.openScenario', { name: scenario.name })}
      className={styles.card}
      data-preview-active={isMobilePreviewActive}
      data-preview-playing={isMobilePreviewActive && isMobilePreviewPlaying}
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className={styles.media}>
        <img
          alt={scenario.name}
          className={styles.image}
          loading="lazy"
          src={getScenarioImageUrl(scenario)}
        />
        {scenario.promoVideoUrl ? (
          <video
            aria-label={t('explore.aria.videoPreview', {
              name: scenario.name,
            })}
            className={styles.video}
            loop
            muted
            playsInline
            preload="metadata"
            ref={videoRef}
            src={scenario.promoVideoUrl}
            onPause={() => setIsMobilePreviewPlaying(false)}
            onPlaying={() => {
              if (isMobilePreviewActiveRef.current) {
                setIsMobilePreviewPlaying(true);
              }
            }}
          />
        ) : null}
        <div className={styles.overlay} />
      </div>

      <div className={styles.content}>
        <p className={styles.characterMeta}>
          <span>{scenario.character.name}</span>
          <span>, {scenario.character.age}</span>
        </p>

        <h3 className={styles.name}>{scenario.name}</h3>

        <p className={styles.description}>{scenario.shortDescription}</p>
      </div>
    </article>
  );
}

function ScenarioCardSkeleton() {
  return (
    <article className={`${styles.card} ${styles.skeletonCard}`}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.skeletonMeta}>
          <span className={styles.skeletonLine} style={{ width: '42%' }} />
          <span className={styles.skeletonLine} style={{ width: 24 }} />
        </div>

        <span className={styles.skeletonLine} style={{ height: 28, width: '72%' }} />

        <div className={styles.skeletonText}>
          <span className={styles.skeletonLine} style={{ width: '84%' }} />
          <span className={styles.skeletonLine} style={{ width: '64%' }} />
        </div>
      </div>
    </article>
  );
}

function StoriesSkeleton() {
  const { t } = useTranslation();

  return (
    <section aria-label={t('explore.aria.stories')} className={styles.storiesSection}>
      <div className={styles.storyList}>
        {Array.from({ length: 8 }, (_, index) => (
          <div className={styles.storySkeleton} key={index}>
            <span className={styles.storyVisual}>
              <span className={styles.storySkeletonAvatar} />
            </span>
            <span className={styles.skeletonLine} style={{ width: '75%' }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function adaptStories(storiesData: IStoriesResponse | undefined): ExploreStory[] {
  const seenStoryIds = new Set(storiesData?.seenStories ?? []);

  return (storiesData?.stories ?? []).flatMap((story) => {
    if (!story.character) return [];

    return {
      ...story,
      character: {
        age: story.character.age,
        avatarUrl: story.character.avatarUrl,
        id: story.character.id,
        name: story.character.name,
        promoImgUrl: story.character.promoImgUrl ?? null,
      },
      isSeen: seenStoryIds.has(story.id),
    };
  });
}

function openScenarioSlugDeepLink(slug: string) {
  const botUsername = import.meta.env.VITE_BOT_USERNAME;

  if (!botUsername || !slug) {
    return false;
  }

  TelegramWebApp.openTelegramLink(`https://t.me/${botUsername}?start=s_${slug}`);
  TelegramWebApp.close();
  return true;
}

function openScenarioDeepLink(scenario: ScenarioListItem) {
  return openScenarioSlugDeepLink(scenario.slug);
}

export function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { characterType, setCharacterType } = useCharacterTypeParam();
  const [searchValue, setSearchValue] = useState('');
  const [activeTag, setActiveTag] = useState<CharacterFilterTag | null>(null);
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioListItem | null>(null);
  const [activePreviewScenarioId, setActivePreviewScenarioId] = useState<
    string | null
  >(null);
  const [viewer, setViewer] = useState<StoryViewerState | null>(null);
  const [viewerGroupOrder, setViewerGroupOrder] = useState<string[] | null>(
    null,
  );
  const activePreviewScenarioIdRef = useRef<string | null>(null);
  const cardNodesRef = useRef(new Map<string, HTMLElement>());
  const listRef = useRef<HTMLDivElement | null>(null);
  const syncingStoryIdsRef = useRef(new Set<string>());

  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchValue = deferredSearchValue.trim();
  const activeTagQuery =
    activeTag == null
      ? undefined
      : (CHARACTER_FILTER_PARAMS[activeTag] as Partial<ScenarioListQuery>);
  const nextCharacterType =
    characterType === CharacterType.Realistic
      ? CharacterType.Anime
      : CharacterType.Realistic;
  const nextCharacterTypeLabel = t(`explore.typeToggle.${nextCharacterType}`);
  const query: ScenarioListQuery = {
    ...EXPLORE_SCENARIOS_QUERY,
    type: characterType,
    ...(activeTagQuery ?? {}),
    ...(normalizedSearchValue ? { search: normalizedSearchValue } : {}),
  };

  const scenariosQuery = useQuery({
    queryKey: scenarioKeys.list(query),
    queryFn: () => getScenarios(query),
  });
  const scenarios = useMemo(
    () => scenariosQuery.data?.data ?? [],
    [scenariosQuery.data?.data],
  );
  const errorMessage =
    scenariosQuery.error instanceof Error
      ? scenariosQuery.error.message
      : t('explore.failed');

  const storiesQuery = useQuery({
    queryKey: ['stories'],
    queryFn: getStories,
    staleTime: 30_000,
  });

  const adaptedStories = useMemo(
    () => adaptStories(storiesQuery.data),
    [storiesQuery.data],
  );
  const groups = useMemo(() => groupStories(adaptedStories), [adaptedStories]);
  const orderedGroups = useMemo(() => sortStoryGroupsByUnseen(groups), [groups]);
  const viewerGroups = useMemo(() => {
    if (!viewerGroupOrder) return orderedGroups;

    const groupsByCharacterId = new Map(
      groups.map((group) => [group.character.id, group]),
    );

    return viewerGroupOrder.flatMap((characterId) => {
      const group = groupsByCharacterId.get(characterId);
      return group ? [group] : [];
    });
  }, [groups, orderedGroups, viewerGroupOrder]);
  const current = viewer ? getCurrentStory(viewerGroups, viewer) : null;
  const currentStoryId = current?.story.id ?? null;
  const currentStoryIsSeen = current?.story.isSeen ?? true;
  const currentStoryCanStartChat = Boolean(current);

  useEffect(() => {
    if (
      !currentStoryId ||
      currentStoryIsSeen ||
      syncingStoryIdsRef.current.has(currentStoryId)
    ) {
      return;
    }

    syncingStoryIdsRef.current.add(currentStoryId);
    queryClient.setQueryData<IStoriesResponse | undefined>(
      ['stories'],
      (cache) => {
        if (!cache || cache.seenStories.includes(currentStoryId)) {
          return cache;
        }

        return {
          ...cache,
          seenStories: [...cache.seenStories, currentStoryId],
        };
      },
    );

    void markStorySeen(currentStoryId)
      .catch(() => undefined)
      .finally(() => {
        syncingStoryIdsRef.current.delete(currentStoryId);
      });
  }, [currentStoryId, currentStoryIsSeen, queryClient]);

  const updateActivePreviewScenarioId = useCallback(
    (scenarioId: string | null) => {
      activePreviewScenarioIdRef.current = scenarioId;
      setActivePreviewScenarioId(scenarioId);
    },
    [],
  );

  const setCardRef = useCallback(
    (scenarioId: string) => (node: HTMLElement | null) => {
      if (node) {
        node.dataset.scenarioId = scenarioId;
        cardNodesRef.current.set(scenarioId, node);
        return;
      }

      cardNodesRef.current.delete(scenarioId);
    },
    [],
  );

  useEffect(() => {
    if (
      typeof window.matchMedia !== 'function' ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return undefined;
    }

    const mobileMedia = window.matchMedia(MOBILE_MEDIA_QUERY);
    let observer: IntersectionObserver | null = null;

    const getViewportHeight = () =>
      window.innerHeight || document.documentElement.clientHeight || 0;

    type MobilePreviewCandidate = {
      bottom: number;
      left: number;
      order: number;
      scenarioId: string;
      top: number;
    };

    type MobilePreviewRow = {
      bottom: number;
      candidates: MobilePreviewCandidate[];
      top: number;
    };

    const getVisibleCandidate = (
      scenarioId: string,
      node: HTMLElement,
      order: number,
    ): MobilePreviewCandidate | null => {
      const viewportHeight = getViewportHeight();
      const rect = node.getBoundingClientRect();

      if (
        viewportHeight <= 0 ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.bottom <= 0 ||
        rect.top >= viewportHeight
      ) {
        return null;
      }

      return {
        bottom: rect.bottom,
        left: rect.left,
        order,
        scenarioId,
        top: rect.top,
      };
    };

    const getRows = (candidates: MobilePreviewCandidate[]) => {
      const rows: MobilePreviewRow[] = [];

      candidates.forEach((candidate) => {
        const row = rows.find(
          (currentRow) =>
            Math.abs(currentRow.top - candidate.top) <=
            MOBILE_PREVIEW_ROW_EPSILON_PX,
        );

        if (!row) {
          rows.push({
            bottom: candidate.bottom,
            candidates: [candidate],
            top: candidate.top,
          });
          return;
        }

        row.top = Math.min(row.top, candidate.top);
        row.bottom = Math.max(row.bottom, candidate.bottom);
        row.candidates.push(candidate);
      });

      return rows;
    };

    const getRowContainingLine = (
      rows: MobilePreviewRow[],
      activeLine: number,
    ) =>
      rows.find((row) => activeLine >= row.top && activeLine <= row.bottom) ??
      null;

    const getRowByScenarioId = (
      rows: MobilePreviewRow[],
      scenarioId: string | null,
    ) => {
      if (!scenarioId) return null;

      return (
        rows.find((row) =>
          row.candidates.some((candidate) => candidate.scenarioId === scenarioId),
        ) ?? null
      );
    };

    const getNextActiveScenarioId = () => {
      if (document.visibilityState === 'hidden') return null;

      const viewportHeight = getViewportHeight();
      const activeLine = viewportHeight * MOBILE_PREVIEW_ACTIVE_LINE_RATIO;
      const candidates: MobilePreviewCandidate[] = [];

      for (const [order, [scenarioId, node]] of Array.from(
        cardNodesRef.current.entries(),
      ).entries()) {
        const candidate = getVisibleCandidate(scenarioId, node, order);
        if (candidate) candidates.push(candidate);
      }

      const rows = getRows(candidates);
      const currentScenarioId = activePreviewScenarioIdRef.current;
      const activeRow = getRowContainingLine(rows, activeLine);

      if (!activeRow) {
        return getRowByScenarioId(rows, currentScenarioId)
          ? currentScenarioId
          : null;
      }

      const rowCandidates = [...activeRow.candidates].sort((a, b) => {
        if (a.left !== b.left) return a.left - b.left;
        return a.order - b.order;
      });
      const rowMiddle = activeRow.top + (activeRow.bottom - activeRow.top) / 2;
      const currentCandidateIndex = rowCandidates.findIndex(
        (candidate) => candidate.scenarioId === currentScenarioId,
      );

      if (
        currentCandidateIndex >= 0 &&
        Math.abs(activeLine - rowMiddle) <
          MOBILE_PREVIEW_ROW_SPLIT_HYSTERESIS_PX
      ) {
        return currentScenarioId;
      }

      const targetIndex = activeLine < rowMiddle ? 0 : 1;
      const activeCandidate =
        rowCandidates[Math.min(targetIndex, rowCandidates.length - 1)];

      return activeCandidate?.scenarioId ?? null;
    };

    const refreshActiveScenario = () => {
      updateActivePreviewScenarioId(getNextActiveScenarioId());
    };

    const stopObserving = () => {
      observer?.disconnect();
      observer = null;
      updateActivePreviewScenarioId(null);
    };

    const startObserving = () => {
      stopObserving();

      if (!mobileMedia.matches || selectedScenario) return;

      observer = new IntersectionObserver(() => refreshActiveScenario(), {
        threshold: [0, 0.6, 0.75, 1],
      });

      cardNodesRef.current.forEach((node) => observer?.observe(node));
    };

    const onMediaChange = () => {
      startObserving();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateActivePreviewScenarioId(null);
        return;
      }

      startObserving();
    };

    startObserving();
    mobileMedia.addEventListener('change', onMediaChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mobileMedia.removeEventListener('change', onMediaChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer?.disconnect();
    };
  }, [scenarios, selectedScenario, updateActivePreviewScenarioId]);

  const openGroup = (group: StoryGroup) => {
    setViewerGroupOrder(orderedGroups.map((item) => item.character.id));
    setViewer({
      characterId: group.character.id,
      storyIndex: getInitialStoryIndex(group),
    });
  };

  const closeViewer = () => {
    if (listRef.current) {
      listRef.current.scrollLeft = 0;
    }

    setViewer(null);
    setViewerGroupOrder(null);
  };

  const getCachedScenarioSlugForCharacter = useCallback(
    (characterId: string) => {
      const cachedLists = queryClient.getQueriesData<
        Paginated<ScenarioListItem>
      >({
        queryKey: scenarioKeys.lists(),
      });

      for (const [, cachedList] of cachedLists) {
        const scenario = cachedList?.data.find(
          (item) => item.character.id === characterId && item.slug,
        );

        if (scenario?.slug) return scenario.slug;
      }

      return null;
    },
    [queryClient],
  );

  const getScenarioSlugForCharacter = useCallback(
    async (characterId: string) => {
      const cachedSlug = getCachedScenarioSlugForCharacter(characterId);

      if (cachedSlug) return cachedSlug;

      const characterScenariosQuery = {
        characterId,
        skip: 0,
        take: 1,
      } satisfies ScenarioListQuery;
      const page = await queryClient.fetchQuery({
        queryKey: scenarioKeys.list(characterScenariosQuery),
        queryFn: () => getScenarios(characterScenariosQuery),
      });

      return page.data.find((scenario) => scenario.slug)?.slug ?? null;
    },
    [getCachedScenarioSlugForCharacter, queryClient],
  );

  const handleStoryStartChat = async (characterId: string) => {
    const slug = await getScenarioSlugForCharacter(characterId);
    if (!slug || !openScenarioSlugDeepLink(slug)) {
      throw new Error(t('explore.chatUnavailable'));
    }
  };

  const handleScenarioStartChat = () => {
    if (!selectedScenario) return;
    openScenarioDeepLink(selectedScenario);
  };

  const openScenarioContent = (scenario: ScenarioListItem) => {
    setSelectedScenario(null);
    navigate(`/scenarios/${scenario.id}`);
  };

  return (
    <div className={styles.page}>
      {storiesQuery.isLoading ? (
        <StoriesSkeleton />
      ) : orderedGroups.length > 0 ? (
        <section
          aria-label={t('explore.aria.stories')}
          className={styles.storiesSection}
        >
          <div className={styles.storyList} ref={listRef}>
            {orderedGroups.map((group) => {
              const hasUnseenStory = group.stories.some(
                (story) => !story.isSeen,
              );

              return (
                <button
                  aria-label={t('storyViewer.stories', {
                    name: group.character.name,
                  })}
                  className={styles.story}
                  key={group.character.id}
                  type="button"
                  onClick={() => openGroup(group)}
                >
                  <span className={styles.storyVisual}>
                    <span
                      className={cn(styles.storyRing, [], {
                        [styles.storyRingSeen]: !hasUnseenStory,
                      })}
                    >
                      <img
                        alt=""
                        className={styles.storyAvatar}
                        loading="lazy"
                        src={group.character.avatarUrl}
                      />
                    </span>
                  </span>
                  <span className={styles.storyName}>
                    {group.character.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.filters}>
          <div className={styles.searchRow}>
            <label className={styles.searchInput}>
              <span className={styles.searchIcon} aria-hidden="true">
                <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                  <path
                    d="m12.75 12.75 3 3M14.25 8.25a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
              <input
                placeholder={t('explore.searchPlaceholder')}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </label>

            <button
              aria-label={t('explore.typeToggle.switchTo', {
                type: nextCharacterTypeLabel,
              })}
              className={cn(styles.typeToggle, [], {
                [styles.typeToggleAnime]:
                  nextCharacterType === CharacterType.Anime,
                [styles.typeToggleRealistic]:
                  nextCharacterType === CharacterType.Realistic,
              })}
              type="button"
              onClick={() => setCharacterType(nextCharacterType)}
            >
              {nextCharacterType === CharacterType.Anime ? (
                <SparklesIcon aria-hidden="true" />
              ) : (
                <HeartIcon aria-hidden="true" />
              )}
              <span>{nextCharacterTypeLabel}</span>
            </button>
          </div>

          <span className={styles.filtersDivider} aria-hidden="true" />

          <div
            className={styles.tags}
            role="toolbar"
            aria-label={t('explore.aria.filters')}
          >
            {SCENARIO_FILTER_TAGS.map((tag) => {
              const isActive = tag === activeTag;

              return (
                <button
                  aria-pressed={isActive}
                  className={cn(styles.tagButton, [], {
                    [styles.tagButtonActive]: isActive,
                  })}
                  key={tag}
                  type="button"
                  onClick={() =>
                    setActiveTag((currentTag) =>
                      currentTag === tag ? null : tag,
                    )
                  }
                >
                  <span>
                    {t(`character.filter.${tag}`, {
                      defaultValue: CHARACTER_FILTER_TAG_LABELS[tag],
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {scenariosQuery.isLoading ? (
          <div className={styles.grid}>
            {Array.from(
              { length: EXPLORE_SCENARIOS_QUERY.take },
              (_, index) => (
                <ScenarioCardSkeleton key={index} />
              ),
            )}
          </div>
        ) : null}

        {scenariosQuery.isError ? (
          <div className={styles.alert}>
            <strong>{t('explore.unable')}</strong>
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {!scenariosQuery.isLoading &&
        !scenariosQuery.isError &&
        scenarios.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>{t('explore.noResults')}</strong>
            <span>{t('explore.noResultsDescription')}</span>
          </div>
        ) : null}

        {!scenariosQuery.isLoading &&
        !scenariosQuery.isError &&
        scenarios.length > 0 ? (
          <div className={styles.grid}>
            {scenarios.map((scenario) => (
              <ScenarioCard
                cardRef={setCardRef(scenario.id)}
                isMobilePreviewActive={activePreviewScenarioId === scenario.id}
                key={scenario.id}
                scenario={scenario}
                onOpen={setSelectedScenario}
              />
            ))}
          </div>
        ) : null}
      </section>

      {viewer ? (
        <StoryViewer
          groups={viewerGroups}
          viewer={viewer}
          onChange={setViewer}
          onClose={closeViewer}
          onStartChat={
            currentStoryCanStartChat ? handleStoryStartChat : undefined
          }
        />
      ) : null}

      <ScenarioDetailsDrawer
        actions={
          <>
            <button
              className={`${styles.drawerAction} ${styles.drawerPrimary}`}
              disabled={!selectedScenario?.slug}
              type="button"
              onClick={handleScenarioStartChat}
            >
              <MessageIcon aria-hidden="true" />
              <span>{t('scenarioDetails.textHer')}</span>
            </button>
            <button
              className={`${styles.drawerAction} ${styles.drawerSecondary}`}
              type="button"
              onClick={() => {
                if (selectedScenario) openScenarioContent(selectedScenario);
              }}
            >
              <CameraIcon aria-hidden="true" />
              <span>{t('explore.actions.viewContent')}</span>
            </button>
          </>
        }
        open={selectedScenario !== null}
        scenario={selectedScenario}
        onClose={() => setSelectedScenario(null)}
        onScenarioSelect={setSelectedScenario}
        onSeeContent={openScenarioContent}
      />
    </div>
  );
}
