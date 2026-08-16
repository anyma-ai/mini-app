import { useQuery } from '@tanstack/react-query';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { getScenarioPromo, scenarioKeys } from '@/api/scenarios';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/assets/icons';
import {
  ContentItemType,
  type ScenarioListItem,
  type ScenarioMedia,
  type ScenarioPromo,
} from '@/common/types';
import { cn } from '@/common/utils';

import styles from './ScenarioDetailsDrawer.module.scss';

const DRAWER_EXIT_DURATION_MS = 280;

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

function formatPersonality(
  personality: ScenarioListItem['character']['personality'],
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!Array.isArray(personality) || personality.length === 0) {
    return '';
  }

  return personality
    .map((item) =>
      t(`character.personality.${item}`, {
        defaultValue: item.charAt(0).toUpperCase() + item.slice(1),
      }),
    )
    .join(', ');
}

type PromoSlide =
  | {
      id: string;
      scenario: ScenarioListItem;
      type: 'promo-video';
    }
  | {
      id: string;
      item: ScenarioMedia;
      mediaIndex: number;
      type: 'media';
    }
  | {
      id: string;
      items: ScenarioMedia[];
      scenario: ScenarioListItem;
      type: 'see-content';
    };

type PromoSlidePlacement = 'active' | 'hidden' | 'next' | 'previous';

function normalizeIndex(index: number, total: number) {
  return (index + total) % total;
}

function getSlidePlacement(
  index: number,
  activeIndex: number,
  total: number,
): PromoSlidePlacement {
  if (index === activeIndex) return 'active';
  if (total < 2) return 'hidden';
  if (index === normalizeIndex(activeIndex - 1, total)) return 'previous';
  if (index === normalizeIndex(activeIndex + 1, total)) return 'next';
  return 'hidden';
}

function getMediaAlt(
  item: ScenarioMedia,
  index: number,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  return item.isBlurred
    ? t('explore.aria.lockedPreview', { index: index + 1 })
    : t('explore.aria.scenarioPreview', { index: index + 1 });
}

function getScenarioCardImageUrl(scenario: ScenarioListItem) {
  return (
    scenario.promoImgUrl ||
    scenario.openingImageUrl ||
    scenario.character.avatarUrl
  );
}

function renderMediaItem(
  item: ScenarioMedia,
  index: number,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (item.type === ContentItemType.Video) {
    return (
      <video
        aria-label={getMediaAlt(item, index, t)}
        autoPlay
        className={styles.slideMedia}
        loop
        muted
        playsInline
        poster={item.previewUrl ?? undefined}
        preload="metadata"
        src={item.url}
      />
    );
  }

  return (
    <img
      alt={getMediaAlt(item, index, t)}
      className={styles.slideMedia}
      src={item.url}
    />
  );
}

function OtherScenarioCard({
  onOpen,
  scenario,
}: {
  onOpen?: (scenario: ScenarioListItem) => void;
  scenario: ScenarioListItem;
}) {
  const { t } = useTranslation();

  return (
    <button
      aria-label={t('explore.aria.openScenario', { name: scenario.name })}
      className={styles.otherCard}
      type="button"
      onClick={() => onOpen?.(scenario)}
    >
      <img
        alt={scenario.name}
        className={styles.otherCardImage}
        src={getScenarioCardImageUrl(scenario)}
      />
      <span className={styles.otherCardShade} />
      <span className={styles.otherCardCopy}>
        <span className={styles.otherCardTitle}>{scenario.name}</span>
        <span className={styles.otherCardDescription}>
          {scenario.shortDescription || scenario.description}
        </span>
      </span>
    </button>
  );
}

function CreateRoleplayCard({
  characterName,
  imageUrl,
}: {
  characterName: string;
  imageUrl: string;
}) {
  const { t } = useTranslation();

  return (
    <button
      aria-label={t('explore.roleplayComingSoon', { name: characterName })}
      className={styles.createRoleplayCard}
      disabled
      type="button"
    >
      <img alt="" className={styles.otherCardImage} src={imageUrl} />
      <span className={styles.createRoleplayShade} />
      <span className={styles.createRoleplayCopy}>
        <span className={styles.otherCardTitle}>
          {t('explore.yourRoleplay')}
        </span>
        <span className={styles.otherCardDescription}>
          {t('explore.createRoleplay', { name: characterName })}
        </span>
        <span className={styles.createRoleplayCta}>
          <span>{t('explore.soon')}</span>
        </span>
      </span>
    </button>
  );
}

function buildPromoSlides(
  scenario: ScenarioListItem,
  promo: ScenarioPromo | undefined,
): PromoSlide[] {
  const slides: PromoSlide[] = [
    {
      id: 'promo-video',
      scenario,
      type: 'promo-video',
    },
  ];

  if (!promo) return slides;

  const seeContentItems = [
    ...promo.blurredPromoItems,
    ...promo.promoItems,
  ].slice(0, 4);

  slides.push(
    ...promo.promoItems.map((item, mediaIndex) => ({
      id: `media-${item.id}`,
      item,
      mediaIndex,
      type: 'media' as const,
    })),
  );

  slides.push({
    id: 'see-content',
    items: seeContentItems,
    scenario,
    type: 'see-content',
  });

  return slides;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest('a, button'))
    : false;
}

function ScenarioPromoCarousel({
  promo,
  scenario,
  onSeeContent,
}: {
  promo: ScenarioPromo | undefined;
  scenario: ScenarioListItem;
  onSeeContent: () => void;
}) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const swipeStartXRef = useRef<number | null>(null);
  const slides = buildPromoSlides(scenario, promo);
  const hasMultipleSlides = slides.length > 1;
  const safeActiveIndex =
    slides.length > 0 ? Math.min(activeIndex, slides.length - 1) : 0;

  const navigate = useCallback(
    (direction: -1 | 1) => {
      if (slides.length < 2) return;

      setActiveIndex((currentIndex) =>
        normalizeIndex(currentIndex + direction, slides.length),
      );
    },
    [slides.length],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) return;

    swipeStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) {
      swipeStartXRef.current = null;
      return;
    }

    if (swipeStartXRef.current === null) return;

    const deltaX = event.clientX - swipeStartXRef.current;
    swipeStartXRef.current = null;

    if (Math.abs(deltaX) < 40) return;
    navigate(deltaX < 0 ? 1 : -1);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') navigate(-1);
    if (event.key === 'ArrowRight') navigate(1);
  };

  return (
    <div
      aria-label={t('explore.aria.promoPreviews', { name: scenario.name })}
      className={styles.carousel}
      role="group"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={hasMultipleSlides ? onPointerDown : undefined}
      onPointerUp={hasMultipleSlides ? onPointerUp : undefined}
    >
      <div className={styles.carouselTrack}>
        {slides.map((slide, index) => {
          const placement = getSlidePlacement(
            index,
            safeActiveIndex,
            slides.length,
          );
          const isActive = placement === 'active';

          return (
            <div
              aria-hidden={!isActive}
              className={styles.slide}
              data-placement={placement}
              key={slide.id}
            >
              {slide.type === 'promo-video' ? (
                <>
                  <img
                    alt={slide.scenario.name}
                    className={styles.slideMedia}
                    src={slide.scenario.promoImgUrl}
                  />
                  {slide.scenario.promoVideoUrl ? (
                    <video
                      aria-label={t('explore.aria.videoPreview', {
                        name: slide.scenario.name,
                      })}
                      autoPlay={isActive}
                      className={styles.slideMedia}
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      src={slide.scenario.promoVideoUrl}
                    />
                  ) : null}
                </>
              ) : null}

              {slide.type === 'media'
                ? renderMediaItem(slide.item, slide.mediaIndex, t)
                : null}

              {slide.type === 'see-content' ? (
                <div className={styles.seeContentSlide}>
                  <div className={styles.seeContentGrid} aria-hidden="true">
                    {Array.from({ length: 4 }, (_, itemIndex) => {
                      const item = slide.items[itemIndex];
                      const fallbackUrl = getScenarioCardImageUrl(slide.scenario);

                      return (
                        <div
                          className={styles.seeContentCell}
                          key={item?.id ?? itemIndex}
                        >
                          {item ? (
                            <img
                              alt=""
                              className={styles.slideMedia}
                              src={item.url}
                            />
                          ) : fallbackUrl ? (
                            <img
                              alt=""
                              className={styles.slideMedia}
                              src={fallbackUrl}
                            />
                          ) : (
                            <span className={styles.seeContentFallbackCell} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.seeContentOverlay}>
                    <p className={styles.seeContentTitle}>
                      {t('explore.wantMore')}
                    </p>
                    <button
                      className={styles.seeContentButton}
                      tabIndex={isActive ? 0 : -1}
                      type="button"
                      onClick={onSeeContent}
                    >
                      <span>{t('explore.actions.viewContent')}</span>
                      <ChevronRightIcon aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {hasMultipleSlides ? (
        <>
          <button
            aria-label={t('explore.aria.previousPromo')}
            className={cn(styles.carouselArrow, [styles.carouselArrowLeft])}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => navigate(-1)}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <button
            aria-label={t('explore.aria.nextPromo')}
            className={cn(styles.carouselArrow, [styles.carouselArrowRight])}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => navigate(1)}
          >
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}

type ScenarioDetailsDrawerProps = {
  actions?: ReactNode;
  onClose: () => void;
  onScenarioSelect?: (scenario: ScenarioListItem) => void;
  onSeeContent: (scenario: ScenarioListItem) => void;
  open: boolean;
  scenario: ScenarioListItem | null;
};

export function ScenarioDetailsDrawer({
  actions,
  onClose,
  onScenarioSelect,
  onSeeContent,
  open,
  scenario,
}: ScenarioDetailsDrawerProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const promoQuery = useQuery({
    queryKey: scenarioKeys.promo(scenario?.id ?? ''),
    queryFn: () => getScenarioPromo(scenario?.id ?? ''),
    enabled: open && Boolean(scenario),
  });

  const requestClose = useCallback(() => {
    if (isClosing) return;

    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      setIsClosing(false);
      onClose();
    }, DRAWER_EXIT_DURATION_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !scenario) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, requestClose, scenario]);

  if (!open || !scenario) return null;

  const drawerState = isClosing ? 'closing' : 'open';
  const personality = formatPersonality(scenario.character.personality, t);
  const otherScenarios =
    promoQuery.data?.characterScenarios
      .filter((characterScenario) => characterScenario.id !== scenario.id)
      .slice(0, 2) ?? [];
  const shouldRenderOtherSection = Boolean(promoQuery.data);
  const shouldCenterOtherRow = otherScenarios.length < 2;

  return createPortal(
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className={styles.overlay}
      data-state={drawerState}
      role="dialog"
      onClick={requestClose}
    >
      <section
        className={styles.drawer}
        data-state={drawerState}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label={t('explore.aria.closeScenarioDetails')}
          className={styles.close}
          type="button"
          onClick={requestClose}
        >
          <CloseIcon />
        </button>

        <ScenarioPromoCarousel
          key={scenario.id}
          promo={promoQuery.data}
          scenario={scenario}
          onSeeContent={() => onSeeContent(scenario)}
        />

        <div className={styles.copy}>
          <div className={styles.meta}>
            <p className={styles.character}>
              {scenario.character.name}, {scenario.character.age}
            </p>
            <p className={styles.personality}>{personality}</p>
          </div>

          <h2 id={titleId} className={styles.title}>
            {scenario.name}
          </h2>

          <div className={styles.actions}>{actions}</div>

          <p className={styles.description}>{scenario.description}</p>

          {shouldRenderOtherSection ? (
            <section
              aria-labelledby={`${titleId}-other`}
              className={styles.otherSection}
            >
              <h3 className={styles.otherTitle} id={`${titleId}-other`}>
                {t('explore.moreOf', { name: scenario.character.name })}
              </h3>

              <div
                className={cn(styles.otherRow, [], {
                  [styles.otherRowCentered]: shouldCenterOtherRow,
                })}
              >
                {otherScenarios.map((otherScenario) => (
                  <OtherScenarioCard
                    key={otherScenario.id}
                    scenario={otherScenario}
                    onOpen={onScenarioSelect}
                  />
                ))}
                <CreateRoleplayCard
                  characterName={scenario.character.name}
                  imageUrl={scenario.character.avatarUrl}
                />
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}
