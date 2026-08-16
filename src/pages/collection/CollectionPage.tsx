import { useQuery } from '@tanstack/react-query';
import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  useCollectionItemsInfiniteQuery,
  useSaveContentItemMutation,
} from '@/api/content-items';
import { getCharacters } from '@/api/girls';
import { getScenarios, scenarioKeys } from '@/api/scenarios';
import { ChevronDownIcon, HeartIcon, LockIcon, PlayIcon } from '@/assets/icons';
import {
  ContentItemType,
  Explicitness,
  type ICollectionItem,
} from '@/common/types';
import { cn } from '@/common/utils';
import { useUser } from '@/context/UserContext';

import {
  CollectionGallery,
  type GalleryItem,
} from './CollectionGallery';
import styles from './CollectionPage.module.scss';

type CollectionTab = 'all' | ContentItemType.Image | ContentItemType.Video;
type SelectOption = {
  imageUrl?: string | null;
  label: ReactNode;
  text: string;
  value: string;
};

const COLLECTION_TAKE = 100;
const ALL_VALUE = 'all';

const COLLECTION_TABS = [
  { labelKey: 'collection.all', value: 'all' },
  { labelKey: 'collection.photos', value: ContentItemType.Image },
  { labelKey: 'collection.videos', value: ContentItemType.Video },
] satisfies Array<{ labelKey: string; value: CollectionTab }>;

const EXPLICITNESS_FILTERS = [
  { labelKey: 'character.filter.sexy', value: Explicitness.Sexy },
  { labelKey: 'character.filter.nude', value: Explicitness.Nudes },
  { labelKey: 'character.filter.explicit', value: Explicitness.Explicit },
] as const;

function getExplicitnessLabel(
  explicitness: Explicitness | null,
  t: (key: string) => string,
) {
  if (explicitness === Explicitness.Nudes) return t('character.filter.nude');
  if (explicitness === Explicitness.Sexy) return t('character.filter.sexy');
  if (explicitness === Explicitness.Explicit) {
    return t('character.filter.explicit');
  }

  return '';
}

function getMediaLabel(activeTab: CollectionTab, t: (key: string) => string) {
  if (activeTab === ContentItemType.Image) return t('collection.photos');
  if (activeTab === ContentItemType.Video) return t('collection.videos');

  return t('collection.media');
}

function buildFilteredEmptyTitle({
  activeTab,
  characterName,
  explicitness,
  savedOnly,
  scenarioName,
  t,
}: {
  activeTab: CollectionTab;
  characterName?: string;
  explicitness: Explicitness | null;
  savedOnly: boolean;
  scenarioName?: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const parts = [
    savedOnly ? t('common.saved').toLowerCase() : '',
    getExplicitnessLabel(explicitness, t),
    getMediaLabel(activeTab, t),
  ].filter(Boolean);
  const scope = [
    characterName ? t('collection.fromCharacter', { name: characterName }) : '',
    scenarioName ? t('collection.inScenario', { name: scenarioName }) : '',
  ].filter(Boolean);

  return t('collection.noFiltered', {
    filters: [...parts, ...scope].join(' '),
  });
}

function CollectionSkeleton({ label }: { label: string }) {
  return (
    <div aria-label={label} className={styles.grid}>
      {Array.from({ length: 12 }, (_, index) => (
        <div className={styles.skeletonTile} key={index} />
      ))}
    </div>
  );
}

function SelectOptionLabel({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  return (
    <span className={styles.selectOptionLabel}>
      {imageUrl ? (
        <span className={styles.selectOptionAvatar}>
          <img alt="" src={imageUrl} />
        </span>
      ) : null}
      <span>{name}</span>
    </span>
  );
}

function CollectionSelect({
  ariaLabel,
  options,
  value,
  onChange,
  onOpen,
}: {
  ariaLabel: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  const setOpenState = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      onOpen();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.selectRoot} ref={wrapperRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={styles.filterSelect}
        type="button"
        onClick={() => setOpenState(!open)}
      >
        <span>{selected?.label}</span>
        <ChevronDownIcon aria-hidden="true" className={styles.selectChevron} />
      </button>

      {open ? (
        <div className={styles.selectMenu} role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className={cn(styles.selectOption, [], {
                [styles.selectOptionActive]: option.value === value,
              })}
              key={option.value}
              role="option"
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CollectionEmptyState({
  action,
  description = 'You can access all the content you receive from girls here',
  title = 'Your Personal Collection',
}: {
  action: ReactNode;
  description?: string;
  title?: string;
}) {
  return (
    <div className={styles.emptyState}>
      <h1>{title}</h1>
      <p>{description}</p>
      {action}
    </div>
  );
}

function CollectionTile({
  item,
  onOpen,
}: {
  item: ICollectionItem;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageUrl = item.url ?? item.scenario.promoImgUrl;

  const handlePointerEnter = () => {
    if (item.type !== ContentItemType.Video || item.isBlurred) return;

    void videoRef.current?.play().catch(() => {
      videoRef.current?.pause();
    });
  };

  const handlePointerLeave = () => {
    const video = videoRef.current;

    if (!video) return;

    video.pause();
    video.currentTime = 0;
  };

  return (
    <button
      aria-label={
        item.isBlurred ? t('collection.lockedItem') : t('common.collectionItem')
      }
      className={cn(styles.tile, [], {
        [styles.tileLocked]: item.isBlurred,
      })}
      type="button"
      onClick={() => {
        if (!item.isBlurred) {
          onOpen(item.id);
        }
      }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {item.type === ContentItemType.Video ? (
        <>
          <video
            className={cn(styles.tileMedia, [], {
              [styles.tileMediaBlurred]: item.isBlurred,
            })}
            muted
            playsInline
            poster={item.previewUrl ?? undefined}
            preload="none"
            ref={videoRef}
            src={item.url ?? undefined}
          />
          <span aria-hidden="true" className={styles.tilePlayIcon}>
            <PlayIcon />
          </span>
        </>
      ) : (
        <img
          alt=""
          className={cn(styles.tileMedia, [], {
            [styles.tileMediaBlurred]: item.isBlurred,
          })}
          loading="lazy"
          src={imageUrl}
        />
      )}

      <div className={styles.tileOverlay}>
        <span>{item.character.name}</span>
        <span>{item.scenario.name}</span>
      </div>

      {item.isBlurred ? (
        <span aria-hidden="true" className={styles.lockOverlay}>
          <LockIcon />
        </span>
      ) : null}
    </button>
  );
}

export function CollectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { error: userError, isLoading: isUserLoading, user } = useUser();
  const isReady = !isUserLoading && Boolean(user);
  const [activeTab, setActiveTab] = useState<CollectionTab>('all');
  const [characterId, setCharacterId] = useState(ALL_VALUE);
  const [scenarioId, setScenarioId] = useState(ALL_VALUE);
  const [explicitness, setExplicitness] = useState<Explicitness | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [shouldLoadCharacters, setShouldLoadCharacters] = useState(false);
  const [shouldLoadScenarios, setShouldLoadScenarios] = useState(false);
  const [galleryActiveId, setGalleryActiveId] = useState<string | null>(null);
  const saveContentItem = useSaveContentItemMutation();

  const charactersQuery = useQuery({
    queryKey: ['characters', 'list', { skip: 0, take: COLLECTION_TAKE }],
    queryFn: () => getCharacters({ skip: 0, take: COLLECTION_TAKE }),
    enabled:
      isReady && (shouldLoadCharacters || characterId !== ALL_VALUE),
  });
  const scenariosQuery = useQuery({
    queryKey: scenarioKeys.list({ skip: 0, take: COLLECTION_TAKE }),
    queryFn: () => getScenarios({ skip: 0, take: COLLECTION_TAKE }),
    enabled: isReady && (shouldLoadScenarios || scenarioId !== ALL_VALUE),
  });
  const hasActiveFilters =
    activeTab !== 'all' ||
    characterId !== ALL_VALUE ||
    scenarioId !== ALL_VALUE ||
    explicitness !== null ||
    savedOnly;
  const baseContentQuery = useCollectionItemsInfiniteQuery({}, isReady);
  const filteredContentQuery = useCollectionItemsInfiniteQuery(
    {
      ...(activeTab === 'all' ? {} : { type: activeTab }),
      ...(characterId === ALL_VALUE ? {} : { characterId }),
      ...(scenarioId === ALL_VALUE ? {} : { scenarioId }),
      ...(explicitness ? { explicitness } : {}),
      ...(savedOnly ? { isSaved: true } : {}),
    },
    isReady && hasActiveFilters,
  );
  const contentQuery = hasActiveFilters
    ? filteredContentQuery
    : baseContentQuery;

  const items = useMemo(
    () =>
      (contentQuery.data?.pages.flatMap((page) => page.data) ?? [])
        .slice()
        .sort((left, right) => Number(left.isBlurred) - Number(right.isBlurred)),
    [contentQuery.data],
  );
  const galleryItems = useMemo<GalleryItem[]>(
    () =>
      items
        .filter((item) => !item.isBlurred && (item.url || item.scenario.promoImgUrl))
        .map((item) => ({
          alt: `${item.character.name} ${item.scenario.name}`,
          id: item.id,
          isSaved: item.isSaved,
          previewUrl: item.previewUrl,
          type: item.type === ContentItemType.Video ? 'video' : 'image',
          url: item.url ?? item.scenario.promoImgUrl,
        })),
    [items],
  );
  const characterOptions = [
    {
      label: t('collection.allCharacters'),
      text: t('collection.allCharacters'),
      value: ALL_VALUE,
    },
    ...((charactersQuery.data?.data ?? []).map((character) => ({
      imageUrl: character.avatarUrl,
      label: (
        <SelectOptionLabel imageUrl={character.avatarUrl} name={character.name} />
      ),
      text: character.name,
      value: character.id,
    }))),
  ];
  const scenarioOptions = [
    {
      label: t('collection.allScenarios'),
      text: t('collection.allScenarios'),
      value: ALL_VALUE,
    },
    ...((scenariosQuery.data?.data ?? []).map((scenario) => ({
      imageUrl: scenario.promoImgUrl,
      label: (
        <SelectOptionLabel imageUrl={scenario.promoImgUrl} name={scenario.name} />
      ),
      text: scenario.name,
      value: scenario.id,
    }))),
  ];
  const baseTotal = baseContentQuery.data?.pages[0]?.total ?? 0;
  const hasItems = items.length > 0;
  const hasNoCollectionItems =
    isReady &&
    !baseContentQuery.isLoading &&
    !baseContentQuery.isError &&
    baseTotal === 0;
  const selectedCharacterName = (charactersQuery.data?.data ?? []).find(
    (character) => character.id === characterId,
  )?.name;
  const selectedScenarioName = (scenariosQuery.data?.data ?? []).find(
    (scenario) => scenario.id === scenarioId,
  )?.name;
  const filteredEmptyTitle = buildFilteredEmptyTitle({
    activeTab,
    characterName:
      characterId === ALL_VALUE ? undefined : String(selectedCharacterName),
    explicitness,
    savedOnly,
    scenarioName:
      scenarioId === ALL_VALUE ? undefined : String(selectedScenarioName),
    t,
  });
  const errorMessage =
    contentQuery.error instanceof Error
      ? contentQuery.error.message
      : userError || t('collection.failed');

  return (
    <section className={styles.page}>
      {!hasNoCollectionItems ? (
        <div className={styles.toolbar}>
          <div className={styles.scopeFilters}>
            <CollectionSelect
              ariaLabel={t('collection.allCharacters')}
              options={characterOptions}
              value={characterId}
              onChange={setCharacterId}
              onOpen={() => setShouldLoadCharacters(true)}
            />
            <CollectionSelect
              ariaLabel={t('collection.allScenarios')}
              options={scenarioOptions}
              value={scenarioId}
              onChange={setScenarioId}
              onOpen={() => setShouldLoadScenarios(true)}
            />
          </div>

          <div
            aria-label={t('collection.ariaFilters')}
            className={styles.quickFilters}
          >
            {EXPLICITNESS_FILTERS.map((filter) => {
              const isActive = explicitness === filter.value;

              return (
                <button
                  aria-pressed={isActive}
                  className={cn(styles.filterButton, [], {
                    [styles.filterButtonActive]: isActive,
                  })}
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    setExplicitness((current) =>
                      current === filter.value ? null : filter.value,
                    )
                  }
                >
                  {t(filter.labelKey)}
                </button>
              );
            })}
            <button
              aria-pressed={savedOnly}
              className={cn(styles.savedButton, [], {
                [styles.savedButtonActive]: savedOnly,
              })}
              type="button"
              onClick={() => setSavedOnly((current) => !current)}
            >
              <HeartIcon aria-hidden="true" />
              {t('common.saved')}
            </button>
          </div>
        </div>
      ) : null}

      {!hasNoCollectionItems ? (
        <div className={styles.tabs} role="tablist">
          {COLLECTION_TABS.map((tab) => {
            const active = activeTab === tab.value;

            return (
              <button
                aria-selected={active}
                className={cn(styles.tabButton, [], {
                  [styles.tabButtonActive]: active,
                })}
                key={tab.value}
                role="tab"
                type="button"
                onClick={() => setActiveTab(tab.value)}
              >
              {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      ) : null}

      {isUserLoading ? <CollectionSkeleton label={t('collection.loading')} /> : null}

      {isReady && contentQuery.isLoading ? (
        <CollectionSkeleton label={t('collection.loading')} />
      ) : null}

      {isReady && contentQuery.isError ? (
        <div className={styles.collectionError}>
          <div>
            <h2>{t('collection.unable')}</h2>
            <p>{errorMessage}</p>
          </div>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => {
              void contentQuery.refetch();
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      {hasNoCollectionItems ? (
        <CollectionEmptyState
          action={
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => navigate('/explore')}
            >
              {t('collection.startChat')}
            </button>
          }
        />
      ) : null}

      {isReady &&
      !hasNoCollectionItems &&
      !contentQuery.isLoading &&
      !contentQuery.isError &&
      !hasItems ? (
        <CollectionEmptyState
          action={
            <div className={styles.emptyActions}>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => navigate('/explore')}
              >
                {t('collection.startChat')}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setCharacterId(ALL_VALUE);
                  setScenarioId(ALL_VALUE);
                  setExplicitness(null);
                  setSavedOnly(false);
                }}
              >
                {t('collection.clearFilters')}
              </button>
            </div>
          }
          description={t('collection.emptyFiltered')}
          title={filteredEmptyTitle}
        />
      ) : null}

      {isReady &&
      !hasNoCollectionItems &&
      !contentQuery.isLoading &&
      !contentQuery.isError &&
      hasItems ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <CollectionTile
              item={item}
              key={item.id}
              onOpen={setGalleryActiveId}
            />
          ))}
        </div>
      ) : null}

      {isReady && !hasNoCollectionItems && contentQuery.isFetchingNextPage ? (
        <CollectionSkeleton label={t('collection.loading')} />
      ) : null}

      {isReady && !hasNoCollectionItems && contentQuery.hasNextPage ? (
        <div className={styles.loadMoreWrap}>
          <button
            className={styles.secondaryButton}
            disabled={contentQuery.isFetchingNextPage}
            type="button"
            onClick={() => {
              void contentQuery.fetchNextPage();
            }}
          >
            {t('common.loadMore')}
          </button>
        </div>
      ) : null}

      <CollectionGallery
        activeId={galleryActiveId}
        items={galleryItems}
        open={Boolean(galleryActiveId)}
        onActiveChange={setGalleryActiveId}
        onClose={() => setGalleryActiveId(null)}
        onSave={(item, nextIsSaved) => {
          saveContentItem.mutate({
            id: item.id,
            payload: {
              isSaved: nextIsSaved,
            },
          });
        }}
      />
    </section>
  );
}
