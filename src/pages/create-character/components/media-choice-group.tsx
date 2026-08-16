import { useEffect, useRef, useState } from 'react';

import { cn } from '@/common/utils';

import styles from '../create-character.module.scss';
import type { MediaGridColumns, MediaOption } from '../create-character.types';
import { CheckIcon } from '../icons';

function isVideo(url: string) {
  return /\.mp4($|\?)/i.test(url);
}

function ChoiceMedia({
  active,
  label,
  mediaUrl,
  onSelect,
}: {
  active: boolean;
  label: string;
  mediaUrl: string;
  onSelect: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const shouldPlay = active || isPreviewing;

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (shouldPlay) {
      const playResult = video.play();

      if (playResult) {
        void playResult.catch(() => undefined);
      }

      return;
    }

    video.pause();
  }, [shouldPlay]);

  return (
    <button
      aria-pressed={active}
      className={cn(styles.mediaChoice, undefined, {
        [styles.mediaChoiceActive]: active,
      })}
      type="button"
      onClick={onSelect}
      onBlur={() => setIsPreviewing(false)}
      onFocus={() => setIsPreviewing(true)}
      onMouseEnter={() => setIsPreviewing(true)}
      onMouseLeave={() => setIsPreviewing(false)}
    >
      <span className={styles.mediaFrame}>
        {isVideo(mediaUrl) ? (
          <video
            aria-hidden="true"
            className={styles.mediaAsset}
            loop
            muted
            playsInline
            preload="metadata"
            ref={videoRef}
            src={mediaUrl}
          />
        ) : (
          <img
            alt=""
            className={styles.mediaAsset}
            loading="lazy"
            src={mediaUrl}
          />
        )}
        <span className={styles.mediaOverlay} />
        {active ? (
          <span className={styles.checkMark} aria-hidden="true">
            <CheckIcon />
          </span>
        ) : null}
      </span>
      <span className={styles.mediaLabel}>{label}</span>
    </button>
  );
}

export function MediaChoiceGroup<T extends string>({
  ariaLabel,
  columns = 'wide',
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  columns?: MediaGridColumns;
  options: Array<MediaOption<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(styles.mediaGrid, undefined, {
        [styles.mediaGridCompact]: columns === 'compact',
        [styles.mediaGridTwo]: columns === 'two',
        [styles.mediaGridEthnicity]: columns === 'ethnicity',
        [styles.mediaGridSix]: columns === 'six',
        [styles.mediaGridFace]: columns === 'face',
        [styles.mediaGridBody]: columns === 'body',
        [styles.mediaGridBreast]: columns === 'breast',
        [styles.mediaGridButt]: columns === 'butt',
      })}
      role="group"
    >
      {options.map((option) => (
        <ChoiceMedia
          active={option.value === value}
          key={option.value}
          label={option.label}
          mediaUrl={option.mediaUrl}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}
