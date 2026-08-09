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

import { getScenarioPromo, scenarioKeys } from '@/api/scenarios';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
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
) {
  if (!Array.isArray(personality) || personality.length === 0) {
    return '';
  }

  return personality
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
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

function getMediaAlt(item: ScenarioMedia, index: number) {
  return item.isBlurred
    ? `Locked scenario preview ${index + 1}`
    : `Scenario preview ${index + 1}`;
}

function getScenarioCardImageUrl(scenario: ScenarioListItem) {
  return (
    scenario.promoImgUrl ||
    scenario.openingImageUrl ||
    scenario.character.avatarUrl
  );
}

function renderMediaItem(item: ScenarioMedia, index: number) {
  if (item.type === ContentItemType.Video) {
    return (
      <video
        aria-label={getMediaAlt(item, index)}
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
      alt={getMediaAlt(item, index)}
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
  return (
    <button
      aria-label={`Open ${scenario.name} scenario details`}
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
  return (
    <button
      aria-label={`Create your own story with ${characterName}`}
      className={styles.createRoleplayCard}
      type="button"
      onClick={() => undefined}
    >
      <img alt="" className={styles.otherCardImage} src={imageUrl} />
      <span className={styles.createRoleplayShade} />
      <span className={styles.createRoleplayCopy}>
        <span className={styles.otherCardTitle}>Your Roleplay</span>
        <span className={styles.otherCardDescription}>
          Create your own story with {characterName}
        </span>
        <span className={styles.createRoleplayCta}>
          <span>Create</span>
          <SparklesIcon aria-hidden="true" />
          <span>5</span>
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

  slides.push(
    ...promo.promoItems.map((item, mediaIndex) => ({
      id: `media-${item.id}`,
      item,
      mediaIndex,
      type: 'media' as const,
    })),
  );

  if (promo.blurredPromoItems.length > 0) {
    slides.push({
      id: 'see-content',
      items: promo.blurredPromoItems.slice(0, 4),
      type: 'see-content',
    });
  }

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
      aria-label={`${scenario.name} promo previews`}
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
                      aria-label={`${slide.scenario.name} video preview`}
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
                ? renderMediaItem(slide.item, slide.mediaIndex)
                : null}

              {slide.type === 'see-content' ? (
                <div className={styles.seeContentSlide}>
                  <div className={styles.seeContentGrid} aria-hidden="true">
                    {Array.from({ length: 4 }, (_, itemIndex) => {
                      const item = slide.items[itemIndex];

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
                          ) : (
                            <span className={styles.seeContentFallbackCell} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.seeContentOverlay}>
                    <p className={styles.seeContentTitle}>Want more?</p>
                    <button
                      className={styles.seeContentButton}
                      tabIndex={isActive ? 0 : -1}
                      type="button"
                      onClick={onSeeContent}
                    >
                      <span>View Content</span>
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
            aria-label="Previous promo preview"
            className={cn(styles.carouselArrow, [styles.carouselArrowLeft])}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => navigate(-1)}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <button
            aria-label="Next promo preview"
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
  const personality = formatPersonality(scenario.character.personality);
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
          aria-label="Close scenario details"
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
                More of {scenario.character.name}
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
