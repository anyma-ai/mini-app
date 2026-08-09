import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { ChevronLeftIcon, ChevronRightIcon } from '@/assets/icons';
import { StoryType } from '@/common/types';

import {
  type ExploreStory,
  getAdjacentStory,
  getCurrentStory,
  moveStoryViewer,
  type StoryGroup,
  type StoryViewerState,
} from './stories-model';
import styles from './StoryViewer.module.scss';

const PHOTO_DURATION_MS = 5_000;
const SWIPE_THRESHOLD_PX = 48;
const TAP_MAX_DURATION_MS = 350;

type StoryViewerProps = {
  groups: StoryGroup[];
  isStartingChat?: boolean;
  viewer: StoryViewerState;
  onChange: (viewer: StoryViewerState) => void;
  onClose: () => void;
  onStartChat?: (characterId: string) => Promise<void>;
};

type StoryViewerSlideProps = StoryViewerProps & {
  currentGroup: StoryGroup;
  currentStory: ExploreStory;
};

type PointerStart = {
  id: number;
  startedAt: number;
  x: number;
  y: number;
};

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M4.5 4.5l9 9m0-9-9 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path d="M3 7v4h3l4 3V4L6 7H3Z" fill="currentColor" />
      {muted ? (
        <path
          d="m13 7 3 3m0-3-3 3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      ) : (
        <path
          d="M13 6.5c1.4 1.4 1.4 3.6 0 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

export function StoryViewer({
  groups,
  isStartingChat = false,
  viewer,
  onChange,
  onClose,
  onStartChat,
}: StoryViewerProps) {
  const current = getCurrentStory(groups, viewer);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyWidth = body.style.width;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.width = '100%';

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.width = previousBodyWidth;

      if (scrollX !== 0 || scrollY !== 0) {
        window.scrollTo(scrollX, scrollY);
      }
    };
  }, []);

  if (!current) {
    return null;
  }

  return createPortal(
    <div
      aria-label={`${current.group.character.name} stories`}
      aria-modal="true"
      className={styles.viewer}
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <StoryViewerSlide
        currentGroup={current.group}
        currentStory={current.story}
        groups={groups}
        isStartingChat={isStartingChat}
        key={current.story.id}
        viewer={viewer}
        onChange={onChange}
        onClose={onClose}
        onStartChat={onStartChat}
      />
    </div>,
    document.body,
  );
}

function StoryViewerSlide({
  currentGroup,
  currentStory,
  groups,
  isStartingChat,
  viewer,
  onChange,
  onClose,
  onStartChat,
}: StoryViewerSlideProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasMediaError, setHasMediaError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoElapsedRef = useRef(0);
  const pointerStartRef = useRef<PointerStart | null>(null);

  const navigate = useCallback(
    (direction: 'next' | 'previous') => {
      const nextViewer = moveStoryViewer(groups, viewer, direction);

      if (!nextViewer) {
        onClose();
        return;
      }

      onChange(nextViewer);
    },
    [groups, onChange, onClose, viewer],
  );

  useEffect(() => {
    if (
      currentStory.type !== StoryType.Photo ||
      isPaused ||
      hasMediaError
    ) {
      return undefined;
    }

    let frameId = 0;
    let previousTimestamp: number | null = null;

    const tick = (timestamp: number) => {
      if (previousTimestamp == null) {
        previousTimestamp = timestamp;
      }

      photoElapsedRef.current += timestamp - previousTimestamp;
      previousTimestamp = timestamp;

      const nextProgress = Math.min(
        photoElapsedRef.current / PHOTO_DURATION_MS,
        1,
      );
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        navigate('next');
        return;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [currentStory.type, hasMediaError, isPaused, navigate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentStory.type !== StoryType.Video) {
      return;
    }

    if (isPaused) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      setIsPaused(true);
    });
  }, [currentStory.id, currentStory.type, isPaused]);

  useEffect(() => {
    const video = videoRef.current;

    if (
      !video ||
      currentStory.type !== StoryType.Video ||
      isPaused ||
      hasMediaError
    ) {
      return undefined;
    }

    let frameId = 0;

    const tick = () => {
      const duration = video.duration;
      const nextProgress =
        Number.isFinite(duration) && duration > 0
          ? Math.min(video.currentTime / duration, 1)
          : 0;

      setProgress((currentProgress) =>
        Math.abs(currentProgress - nextProgress) > 0.0005
          ? nextProgress
          : currentProgress,
      );

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [currentStory.id, currentStory.type, hasMediaError, isPaused]);

  useEffect(() => {
    const nextStory = getAdjacentStory(groups, viewer, 'next');
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
  }, [groups, viewer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft') {
        navigate('previous');
        return;
      }

      if (event.key === 'ArrowRight') {
        navigate('next');
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        setIsPaused(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsPaused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [navigate, onClose]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStartRef.current = {
      id: event.pointerId,
      startedAt: Date.now(),
      x: event.clientX,
      y: event.clientY,
    };
    setIsPaused(true);
  };

  const resetPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerStartRef.current = null;
    setIsPaused(false);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const duration = Date.now() - start.startedAt;
    const bounds = event.currentTarget.getBoundingClientRect();

    resetPointer(event);

    if (
      Math.abs(deltaX) >= SWIPE_THRESHOLD_PX &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      navigate(deltaX < 0 ? 'next' : 'previous');
      return;
    }

    if (duration <= TAP_MAX_DURATION_MS) {
      navigate(
        event.clientX - bounds.left < bounds.width / 2 ? 'previous' : 'next',
      );
    }
  };

  const handleStartChat = async () => {
    if (!onStartChat) return;

    setIsPaused(true);

    try {
      await onStartChat(currentGroup.character.id);
    } catch {
      setIsPaused(false);
    }
  };

  return (
    <div className={styles.slide}>
      <button
        aria-label="Previous story"
        className={`${styles.navigation} ${styles.navigationPrevious}`}
        type="button"
        onClick={() => navigate('previous')}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </button>

      <div className={styles.frame}>
        <div className={styles.media}>
          {hasMediaError ? (
            <div className={styles.mediaError}>Unable to load this story.</div>
          ) : currentStory.type === StoryType.Video ? (
            <video
              autoPlay
              className={styles.mediaAsset}
              key={currentStory.id}
              muted={isMuted}
              playsInline
              preload="auto"
              ref={videoRef}
              src={currentStory.fileUrl}
              onEnded={() => navigate('next')}
              onError={() => setHasMediaError(true)}
              onLoadedMetadata={() => setProgress(0)}
            />
          ) : (
            <img
              alt=""
              className={styles.mediaAsset}
              key={currentStory.id}
              src={currentStory.fileUrl}
              onError={() => setHasMediaError(true)}
            />
          )}
        </div>

        <div
          className={styles.gestureLayer}
          onPointerCancel={resetPointer}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        />

        <div className={styles.chrome}>
          <div className={styles.progress}>
            {currentGroup.stories.map((story, index) => {
              const value =
                index < viewer.storyIndex
                  ? 1
                  : index === viewer.storyIndex
                    ? progress
                    : 0;

              return (
                <span className={styles.progressTrack} key={story.id}>
                  <span
                    className={styles.progressFill}
                    style={{ transform: `scaleX(${value})` }}
                  />
                </span>
              );
            })}
          </div>

          <div className={styles.header}>
            <div className={styles.character}>
              <img
                alt={currentGroup.character.name}
                className={styles.avatar}
                src={currentGroup.character.avatarUrl}
              />
              <span className={styles.name}>{currentGroup.character.name}</span>
            </div>

            <div className={styles.actions}>
              {currentStory.type === StoryType.Video ? (
                <button
                  aria-label={isMuted ? 'Unmute story' : 'Mute story'}
                  className={styles.action}
                  type="button"
                  onClick={() => setIsMuted((currentMuted) => !currentMuted)}
                >
                  <SoundIcon muted={isMuted} />
                </button>
              ) : null}

              <button
                aria-label="Close stories"
                className={styles.action}
                type="button"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        </div>

        {onStartChat ? (
          <div
            className={styles.actionBar}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <button
              aria-label={`Text ${currentGroup.character.name}`}
              className={styles.messageAction}
              disabled={isStartingChat}
              type="button"
              onClick={() => void handleStartChat()}
            >
              Text her...
            </button>
          </div>
        ) : null}
      </div>

      <button
        aria-label="Next story"
        className={`${styles.navigation} ${styles.navigationNext}`}
        type="button"
        onClick={() => navigate('next')}
      >
        <ChevronRightIcon aria-hidden="true" />
      </button>
    </div>
  );
}
