import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import {
  type PointerEvent as ReactPointerEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  type ApiResponseError,
  getScenarioDetails,
  getScenarioMedia,
  getScenarioMediaTotals,
  SCENARIO_MEDIA_DEFAULT_TAKE,
  scenarioKeys,
  type ScenarioMediaQuery,
  unblurScenarioVideo,
  unlockScenario,
} from '@/api/scenarios';
import {
  ImageIcon,
  LockIcon,
  PauseIcon,
  PlayIcon,
  ScenarioMessageIcon,
  SparklesIcon,
  SquarePlayIcon,
} from '@/assets/icons';
import {
  SCENARIO_CONTENT_PRICE,
  VIDEO_PRICE,
} from '@/common/consts';
import {
  ContentItemType,
  Explicitness,
  type Paginated,
  type ScenarioDetails,
  type ScenarioMedia,
  type UnblurScenarioVideoResponse,
} from '@/common/types';
import { cn } from '@/common/utils';
import { useUser } from '@/context/UserContext';

import s from './ScenarioDetailsPage.module.scss';

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      {...props}
    >
      <path
        d="m4 4 8 8M12 4l-8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

type ScenarioMediaTab = ContentItemType.Image | ContentItemType.Video;

type GalleryItem = {
  id: string;
  previewUrl: string | null;
  type: ScenarioMediaTab;
  url: string;
};

const MEDIA_TABS = [
  { label: 'Photos', value: ContentItemType.Image },
  { label: 'Videos', value: ContentItemType.Video },
] as const;

const EXPLICITNESS_FILTERS = [
  { label: 'Sexy', value: Explicitness.Sexy },
  { label: 'Nude', value: Explicitness.Nudes },
  { label: 'Explicit', value: Explicitness.Explicit },
] as const;

const SWIPE_THRESHOLD_PX = 48;
const SWIPE_AXIS_RATIO = 1.2;
const SWIPE_CLOSE_THRESHOLD_PX = 70;

function normalizeTab(value: string | null): ScenarioMediaTab {
  return value === ContentItemType.Video
    ? ContentItemType.Video
    : ContentItemType.Image;
}

function getTabQueryValue(tab: ScenarioMediaTab) {
  return tab === ContentItemType.Video ? 'video' : 'image';
}

function formatPersonality(
  personality: ScenarioDetails['character']['personality'],
) {
  if (!Array.isArray(personality) || personality.length === 0) return '';

  return personality
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(', ');
}

function getScenarioImage(scenario: ScenarioDetails) {
  return (
    scenario.promoImgUrl ||
    scenario.promoImgHorizontalUrl ||
    scenario.openingImageUrl ||
    scenario.character.avatarUrl
  );
}

function getPaywallAction(error: unknown) {
  if (!error || typeof error !== 'object') return null;

  const apiError = error as ApiResponseError;
  const details = apiError.details;

  if (apiError.status === 402) {
    return 'BUY_CREDITS';
  }

  if (!details || typeof details !== 'object') return null;

  const record = details as Record<string, unknown>;
  const nestedDetails =
    record.details && typeof record.details === 'object'
      ? (record.details as Record<string, unknown>)
      : null;
  const action =
    record.action ??
    nestedDetails?.action ??
    (record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>).action
      : null);

  return typeof action === 'string' ? action : null;
}

function extractUnblurredVideo(response: UnblurScenarioVideoResponse) {
  if ('id' in response) return response;
  if ('data' in response) {
    const data = response.data;
    if ('id' in data) return data;
    return data.item ?? data.video ?? null;
  }

  return response.item ?? response.video ?? null;
}

function formatRemainingTime(duration: number, currentTime: number) {
  if (!Number.isFinite(duration) || duration <= 0) return '-00:00';

  const remainingSeconds = Math.max(0, Math.ceil(duration - currentTime));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `-${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

function useScenarioMediaQuery(
  scenarioId: string | undefined,
  type: ScenarioMediaTab,
  params: Omit<ScenarioMediaQuery, 'skip' | 'take'>,
) {
  const initialPageParam = {
    skip: 0,
    take: SCENARIO_MEDIA_DEFAULT_TAKE,
  };

  return useInfiniteQuery({
    queryKey: scenarioKeys.media(scenarioId ?? '', type, {
      ...params,
      ...initialPageParam,
    }),
    queryFn: ({ pageParam }) =>
      getScenarioMedia(scenarioId ?? '', type, {
        ...params,
        ...pageParam,
      }),
    enabled: Boolean(scenarioId),
    initialPageParam,
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.take;

      if (nextSkip >= lastPage.total) return undefined;

      return {
        skip: nextSkip,
        take: lastPage.take,
      };
    },
  });
}

function MediaTile({
  media,
  type,
  onLockedImage,
  onLockedVideo,
  onOpen,
}: {
  media: ScenarioMedia;
  type: ScenarioMediaTab;
  onLockedImage: () => void;
  onLockedVideo: () => void;
  onOpen: () => void;
}) {
  const previewUrl = type === ContentItemType.Video ? media.previewUrl : null;

  return (
    <button
      type="button"
      className={cn(s.tile, [], {
        [s.tileLocked]: media.isBlurred,
      })}
      aria-label={media.isBlurred ? 'Locked media' : 'Open media'}
      onClick={() => {
        if (!media.isBlurred) {
          onOpen();
          return;
        }

        if (type === ContentItemType.Video) {
          onLockedVideo();
          return;
        }

        onLockedImage();
      }}
    >
      {type === ContentItemType.Video ? (
        <img
          src={previewUrl ?? media.url}
          alt=""
          className={cn(s.tileMedia, [], {
            [s.tileMediaBlurred]: media.isBlurred,
          })}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <img
          src={media.url}
          alt=""
          className={cn(s.tileMedia, [], {
            [s.tileMediaBlurred]: media.isBlurred,
          })}
          loading="lazy"
          decoding="async"
        />
      )}

      {type === ContentItemType.Video && !media.isBlurred ? (
        <span className={s.playBadge} aria-hidden="true">
          <PlayIcon />
        </span>
      ) : null}

      {media.isBlurred ? (
        <span className={s.lockOverlay} aria-hidden="true">
          {type === ContentItemType.Video ? <PlayIcon /> : <LockIcon />}
        </span>
      ) : null}
    </button>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className={s.modalLayer} role="presentation" onMouseDown={onClose}>
      <div
        className={s.modalContent}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={s.modalClose}
          aria-label="Close modal"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function FullUnlockModal({
  imageTotal,
  isPending,
  scenario,
  videoTotal,
  onClose,
  onUnlock,
}: {
  imageTotal: number;
  isPending: boolean;
  scenario: ScenarioDetails;
  videoTotal: number;
  onClose: () => void;
  onUnlock: () => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className={s.unlockCard}>
        <img
          src={getScenarioImage(scenario)}
          alt=""
          className={s.unlockBackground}
        />
        <div className={s.unlockShade} />
        <div className={s.unlockBody}>
          <h2 className={s.unlockTitle}>{scenario.name}</h2>
          <p className={s.unlockDescription}>
            Unlock all the explicit content of {scenario.character.name} in{' '}
            {scenario.name}.
          </p>

          <div className={s.unlockTotals} aria-label="Scenario content totals">
            <span className={s.unlockTotal}>
              <ImageIcon aria-hidden="true" />
              <strong>{imageTotal.toLocaleString('en-US')}</strong>
              <small>Images</small>
            </span>
            <span className={s.unlockTotal}>
              <SquarePlayIcon aria-hidden="true" />
              <strong>{videoTotal.toLocaleString('en-US')}</strong>
              <small>Videos</small>
            </span>
          </div>

          <span className={s.futureBadge}>+ all future content</span>

          <button
            type="button"
            className={s.unlockButton}
            disabled={isPending}
            onClick={onUnlock}
          >
            <LockIcon aria-hidden="true" />
            <span>
              Unlock all for{' '}
              <span className={s.unlockPrice}>
                <SparklesIcon aria-hidden="true" />
                <strong>
                  {SCENARIO_CONTENT_PRICE.toLocaleString('en-US')}
                </strong>
              </span>
            </span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function VideoUnlockModal({
  isPending,
  media,
  onClose,
  onUnlock,
}: {
  isPending: boolean;
  media: ScenarioMedia;
  onClose: () => void;
  onUnlock: () => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className={s.videoUnlockCard}>
        <img
          src={media.previewUrl ?? media.url}
          alt=""
          className={s.videoUnlockBackground}
        />
        <div className={s.videoUnlockShade} />
        <div className={s.videoUnlockBody}>
          <span className={s.videoUnlockIcon} aria-hidden="true">
            <PlayIcon />
          </span>
          <h2 className={s.videoUnlockTitle}>Full video</h2>
          <button
            type="button"
            className={s.videoUnlockButton}
            disabled={isPending}
            onClick={onUnlock}
          >
            <span>Unlock</span>
            <SparklesIcon aria-hidden="true" />
            <strong>{VIDEO_PRICE}</strong>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function GalleryPreview({
  item,
  className,
}: {
  item: GalleryItem;
  className: string;
}) {
  if (item.type === ContentItemType.Video && item.previewUrl) {
    return <img src={item.previewUrl} alt="" className={className} />;
  }

  if (item.type === ContentItemType.Video) {
    return <span className={cn(className, [s.galleryPreviewFallback])} />;
  }

  return <img src={item.url} alt="" className={className} />;
}

function FullscreenGallery({
  activeId,
  items,
  onActiveChange,
  onClose,
}: {
  activeId: string | null;
  items: GalleryItem[];
  onActiveChange: (id: string | null) => void;
  onClose: () => void;
}) {
  const activeIndex = activeId
    ? items.findIndex((item) => item.id === activeId)
    : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const touchRef = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const [videoPaused, setVideoPaused] = useState(false);
  const [duration, setDuration] = useState(0);

  const navigate = useCallback(
    (direction: 'next' | 'previous') => {
      if (!items.length || activeIndex < 0) return;

      const nextIndex =
        direction === 'next'
          ? (activeIndex + 1) % items.length
          : (activeIndex - 1 + items.length) % items.length;

      onActiveChange(items[nextIndex].id);
    },
    [activeIndex, items, onActiveChange],
  );

  const syncVideoControls = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextDuration = video.duration || duration || 0;
    const currentTime = video.currentTime || 0;
    const percent =
      nextDuration > 0
        ? Math.min(100, Math.max(0, (currentTime / nextDuration) * 100))
        : 0;

    if (progressRef.current) {
      progressRef.current.max = String(nextDuration || 0);
      progressRef.current.value = String(currentTime);
      progressRef.current.disabled = nextDuration <= 0;
      progressRef.current.style.setProperty(
        '--video-progress',
        `${percent}%`,
      );
    }

    if (timeRef.current) {
      timeRef.current.textContent = formatRemainingTime(
        nextDuration,
        currentTime,
      );
    }
  }, [duration]);

  useEffect(() => {
    if (!activeItem) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate('previous');
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem, navigate, onClose]);

  useEffect(() => {
    if (!activeItem) return undefined;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [activeItem]);

  if (!activeItem) return null;

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return;

    touchRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const touch = touchRef.current;

    if (
      !touch ||
      event.pointerType !== 'touch' ||
      event.pointerId !== touch.pointerId
    ) {
      return;
    }

    touchRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const deltaX = event.clientX - touch.x;
    const deltaY = event.clientY - touch.y;

    if (
      deltaY >= SWIPE_CLOSE_THRESHOLD_PX &&
      Math.abs(deltaY) > Math.abs(deltaX) * SWIPE_AXIS_RATIO
    ) {
      onClose();
      return;
    }

    if (
      Math.abs(deltaX) >= SWIPE_THRESHOLD_PX &&
      Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_AXIS_RATIO
    ) {
      navigate(deltaX < 0 ? 'next' : 'previous');
    }
  };

  const handleVideoToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  };

  return createPortal(
    <div
      className={s.gallery}
      role="dialog"
      aria-modal="true"
      aria-label="Media gallery"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={s.galleryBackdrop} aria-hidden="true">
        <GalleryPreview item={activeItem} className={s.galleryBackdropMedia} />
      </div>

      <button
        type="button"
        className={s.galleryClose}
        aria-label="Close gallery"
        onClick={onClose}
      >
        <CloseIcon />
      </button>

      <main
        className={s.galleryStage}
        onPointerCancel={() => {
          touchRef.current = null;
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div className={s.galleryMediaShell}>
          {activeItem.type === ContentItemType.Video ? (
            <>
              <video
                ref={videoRef}
                src={activeItem.url}
                poster={activeItem.previewUrl ?? undefined}
                className={s.galleryMedia}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                onClick={handleVideoToggle}
                onLoadedMetadata={(event) => {
                  setDuration(event.currentTarget.duration || 0);
                  syncVideoControls();
                }}
                onPause={(event) => {
                  setVideoPaused(true);
                  syncVideoControls();
                  event.stopPropagation();
                }}
                onPlay={() => {
                  setVideoPaused(false);
                  syncVideoControls();
                }}
                onTimeUpdate={syncVideoControls}
              />
              <div className={s.videoControls}>
                <button
                  type="button"
                  className={s.videoControlButton}
                  aria-label={videoPaused ? 'Play video' : 'Pause video'}
                  onClick={handleVideoToggle}
                >
                  {videoPaused ? <PlayIcon /> : <PauseIcon />}
                </button>
                <input
                  ref={progressRef}
                  type="range"
                  min={0}
                  max={duration || 0}
                  step="0.01"
                  defaultValue={0}
                  className={s.videoProgress}
                  aria-label="Video progress"
                  onChange={(event) => {
                    const video = videoRef.current;
                    if (!video) return;
                    video.currentTime = event.currentTarget.valueAsNumber;
                    syncVideoControls();
                  }}
                />
                <span ref={timeRef} className={s.videoTime}>
                  -00:00
                </span>
              </div>
            </>
          ) : (
            <img src={activeItem.url} alt="" className={s.galleryMedia} />
          )}
        </div>
      </main>

      {items.length > 1 ? (
        <aside className={s.thumbnails} aria-label="Gallery thumbnails">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={cn(s.thumbnail, [], {
                [s.thumbnailActive]: item.id === activeItem.id,
              })}
              aria-label={`Open media ${index + 1}`}
              aria-current={item.id === activeItem.id ? 'true' : undefined}
              onClick={() => onActiveChange(item.id)}
            >
              <GalleryPreview item={item} className={s.thumbnailMedia} />
              {item.type === ContentItemType.Video ? (
                <span className={s.thumbnailPlay} aria-hidden="true">
                  <PlayIcon />
                </span>
              ) : null}
            </button>
          ))}
        </aside>
      ) : null}
    </div>,
    document.body,
  );
}

export function ScenarioDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refresh } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const mediaSwitchRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToInitialTabRef = useRef(false);
  const initialTabRef = useRef(searchParams.get('tab'));
  const activeTab = normalizeTab(searchParams.get('tab'));
  const [explicitness, setExplicitness] = useState<Explicitness | null>(null);
  const [fullUnlockOpen, setFullUnlockOpen] = useState(false);
  const [lockedVideo, setLockedVideo] = useState<ScenarioMedia | null>(null);
  const [galleryActiveId, setGalleryActiveId] = useState<string | null>(null);
  const [dockVisible, setDockVisible] = useState(false);

  const scenarioQuery = useQuery({
    queryKey: scenarioKeys.detail(id ?? ''),
    queryFn: () => getScenarioDetails(id ?? ''),
    enabled: Boolean(id),
  });
  const scenario = scenarioQuery.data ?? null;
  const isLocked = scenario ? !scenario.isUnlocked : false;
  const mediaParams = scenario?.isUnlocked && explicitness ? { explicitness } : {};
  const mediaQuery = useScenarioMediaQuery(id, activeTab, mediaParams);
  const totalsQuery = useQuery({
    queryKey: scenarioKeys.mediaTotals(id ?? ''),
    queryFn: () => getScenarioMediaTotals(id ?? ''),
    enabled: Boolean(id) && isLocked,
  });

  const unlockMutation = useMutation({
    mutationFn: () => unlockScenario(id ?? ''),
    onSuccess: async (response) => {
      if (id && response?.scenario) {
        queryClient.setQueryData(scenarioKeys.detail(id), response.scenario);
      }

      setFullUnlockOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scenarioKeys.detail(id ?? '') }),
        queryClient.invalidateQueries({ queryKey: scenarioKeys.mediaLists() }),
        queryClient.invalidateQueries({
          queryKey: scenarioKeys.mediaTotals(id ?? ''),
        }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
      await refresh();
    },
  });

  const unblurVideoMutation = useMutation({
    mutationFn: (videoId: string) => unblurScenarioVideo(id ?? '', videoId),
    onSuccess: async (response) => {
      const unblurredVideo = extractUnblurredVideo(response);

      if (id && unblurredVideo) {
        const queryKey = scenarioKeys.media(id, ContentItemType.Video, {
          ...mediaParams,
          skip: 0,
          take: SCENARIO_MEDIA_DEFAULT_TAKE,
        });

        queryClient.setQueryData<
          InfiniteData<Paginated<ScenarioMedia>, ScenarioMediaQuery>
        >(queryKey, (current) => {
          if (!current) return current;

          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.map((item) =>
                item.id === unblurredVideo.id ? unblurredVideo : item,
              ),
            })),
          };
        });

        setGalleryActiveId(unblurredVideo.id);
      }

      setLockedVideo(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scenarioKeys.mediaLists() }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
      await refresh();
    },
  });

  const mediaItems = useMemo(() => {
    return (mediaQuery.data?.pages.flatMap((page) => page.data) ?? []).sort(
      (left, right) => Number(left.isBlurred) - Number(right.isBlurred),
    );
  }, [mediaQuery.data]);

  const galleryItems = useMemo<GalleryItem[]>(
    () =>
      mediaItems
        .filter((media) => !media.isBlurred)
        .map((media) => ({
          id: media.id,
          previewUrl: media.previewUrl,
          type: activeTab,
          url: media.url,
        })),
    [activeTab, mediaItems],
  );

  const updateActiveTab = (tab: ScenarioMediaTab) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', getTabQueryValue(tab));
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (
      hasScrolledToInitialTabRef.current ||
      !initialTabRef.current ||
      mediaQuery.isLoading ||
      mediaQuery.isFetching
    ) {
      return;
    }

    hasScrolledToInitialTabRef.current = true;
    mediaSwitchRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [mediaQuery.isFetching, mediaQuery.isLoading]);

  useEffect(() => {
    if (!isLocked) return undefined;

    const scrollContainer = mediaSwitchRef.current?.closest('main');
    if (!scrollContainer) return undefined;

    const syncDock = () => {
      setDockVisible((scrollContainer as HTMLElement).scrollTop >= 220);
    };

    syncDock();
    scrollContainer.addEventListener('scroll', syncDock, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', syncDock);
    };
  }, [isLocked]);

  const goToCredits = useCallback(() => {
    const returnTo = `/scenarios/${id ?? ''}?tab=${getTabQueryValue(activeTab)}`;
    navigate(`/shop?${new URLSearchParams({ returnTo }).toString()}`);
  }, [activeTab, id, navigate]);

  const handleStartChat = () => {
    if (!scenario) return;

    const botUsername = import.meta.env.VITE_BOT_USERNAME;

    if (!botUsername || !scenario.slug) {
      return;
    }

    TelegramWebApp.openTelegramLink(
      `https://t.me/${botUsername}?start=${scenario.slug}`,
    );
    TelegramWebApp.close();
  };

  const handleFullUnlock = async () => {
    if ((user?.air ?? 0) < SCENARIO_CONTENT_PRICE) {
      setFullUnlockOpen(false);
      goToCredits();
      return;
    }

    try {
      await unlockMutation.mutateAsync();
    } catch (error) {
      if (getPaywallAction(error) === 'BUY_CREDITS') {
        setFullUnlockOpen(false);
        goToCredits();
        return;
      }

      console.error(error);
    }
  };

  const handleVideoUnlock = async () => {
    if (!lockedVideo) return;

    if ((user?.air ?? 0) < VIDEO_PRICE) {
      setLockedVideo(null);
      goToCredits();
      return;
    }

    try {
      await unblurVideoMutation.mutateAsync(lockedVideo.id);
    } catch (error) {
      if (getPaywallAction(error) === 'BUY_CREDITS') {
        setLockedVideo(null);
        goToCredits();
        return;
      }

      console.error(error);
    }
  };

  if (scenarioQuery.isLoading) {
    return <div className={s.empty}>Loading scenario...</div>;
  }

  if (scenarioQuery.isError || !scenario) {
    return (
      <div className={s.empty}>
        {scenarioQuery.error instanceof Error
          ? scenarioQuery.error.message
          : 'Failed to load scenario'}
      </div>
    );
  }

  const personality = formatPersonality(scenario.character.personality);
  const canLoadMore =
    scenario.isUnlocked &&
    Boolean(mediaQuery.hasNextPage) &&
    !mediaQuery.isFetchingNextPage;
  const imageTotal = totalsQuery.data?.images ?? 0;
  const videoTotal = totalsQuery.data?.videos ?? 0;

  return (
    <section className={s.page}>
      <section className={s.profile}>
        <div className={s.avatarFrame}>
          <img
            src={getScenarioImage(scenario)}
            alt={scenario.name}
            className={s.avatarImage}
          />
        </div>

        <div className={s.profileCopy}>
          <h1 className={s.title}>{scenario.name}</h1>
          <div className={s.characterMeta}>
            <span className={s.characterName}>{scenario.character.name}</span>
            <span className={s.characterDetails}>
              {scenario.character.age ? (
                <span>Age: {scenario.character.age}</span>
              ) : null}
              {personality ? <span>{personality}</span> : null}
            </span>
          </div>
          <p className={s.description}>{scenario.description}</p>

          <div className={s.actions}>
            <button type="button" className={s.chatButton} onClick={handleStartChat}>
              <ScenarioMessageIcon aria-hidden="true" />
              <span>Text her</span>
            </button>
            {isLocked ? (
              <button
                type="button"
                className={s.unlockCta}
                disabled={unlockMutation.isPending}
                onClick={() => setFullUnlockOpen(true)}
              >
                <LockIcon aria-hidden="true" />
                <span>Unlock explicit content</span>
              </button>
            ) : null}
          </div>
        </div>

        {scenario.isUnlocked ? (
          <div className={s.filters} aria-label="Scenario explicitness filters">
            {EXPLICITNESS_FILTERS.map((filter) => {
              const active = explicitness === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={active}
                  className={cn(s.filterButton, [], {
                    [s.filterButtonActive]: active,
                  })}
                  onClick={() =>
                    setExplicitness(active ? null : filter.value)
                  }
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className={s.mediaSection} ref={mediaSwitchRef}>
        <div className={s.tabs} role="tablist" aria-label="Scenario media">
          {MEDIA_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              className={cn(s.tabButton, [], {
                [s.tabButtonActive]: activeTab === tab.value,
              })}
              onClick={() => updateActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mediaQuery.isLoading ? (
          <div className={s.grid}>
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className={s.skeletonTile} />
            ))}
          </div>
        ) : null}

        {mediaQuery.isError ? (
          <div className={s.empty}>
            {mediaQuery.error instanceof Error
              ? mediaQuery.error.message
              : 'Failed to load media'}
          </div>
        ) : null}

        {!mediaQuery.isLoading && !mediaQuery.isError && !mediaItems.length ? (
          <div className={s.empty}>
            This scenario has no{' '}
            {activeTab === ContentItemType.Image ? 'photos' : 'videos'} yet.
          </div>
        ) : null}

        {!mediaQuery.isLoading && !mediaQuery.isError && mediaItems.length ? (
          <div className={s.grid}>
            {mediaItems.map((media) => (
              <MediaTile
                key={media.id}
                media={media}
                type={activeTab}
                onLockedImage={() => setFullUnlockOpen(true)}
                onLockedVideo={() => setLockedVideo(media)}
                onOpen={() => setGalleryActiveId(media.id)}
              />
            ))}
          </div>
        ) : null}

        {mediaQuery.isFetchingNextPage ? (
          <div className={s.grid}>
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className={s.skeletonTile} />
            ))}
          </div>
        ) : null}

        {scenario.isUnlocked && mediaQuery.hasNextPage ? (
          <button
            type="button"
            className={s.loadMore}
            disabled={!canLoadMore}
            onClick={() => {
              void mediaQuery.fetchNextPage();
            }}
          >
            Load more
          </button>
        ) : null}
      </section>

      <FullscreenGallery
        activeId={galleryActiveId}
        items={galleryItems}
        onActiveChange={setGalleryActiveId}
        onClose={() => setGalleryActiveId(null)}
      />

      {fullUnlockOpen ? (
        <FullUnlockModal
          imageTotal={imageTotal}
          isPending={unlockMutation.isPending}
          scenario={scenario}
          videoTotal={videoTotal}
          onClose={() => setFullUnlockOpen(false)}
          onUnlock={() => {
            void handleFullUnlock();
          }}
        />
      ) : null}

      {lockedVideo ? (
        <VideoUnlockModal
          isPending={unblurVideoMutation.isPending}
          media={lockedVideo}
          onClose={() => setLockedVideo(null)}
          onUnlock={() => {
            void handleVideoUnlock();
          }}
        />
      ) : null}

      {isLocked ? (
        <aside
          className={s.fullAccessDock}
          aria-hidden={!dockVisible}
          data-visible={dockVisible ? 'true' : 'false'}
        >
          <span className={s.fullAccessLabel}>Full Access</span>
          <button
            type="button"
            className={s.fullAccessButton}
            disabled={unlockMutation.isPending}
            onClick={() => setFullUnlockOpen(true)}
          >
            <LockIcon aria-hidden="true" />
            <span>Unlock explicit content</span>
          </button>
        </aside>
      ) : null}
    </section>
  );
}
