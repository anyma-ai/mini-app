import { useQuery, useQueryClient } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { createPlanInvoice } from '@/api/payments';
import { getPlans } from '@/api/plans';
import oliviaImage from '@/assets/characters/olivia.webp';
import { SparklesIcon, TgStarWhiteIcon } from '@/assets/icons';
import { type IPlan, PlanPeriod, PlanType } from '@/common/types';
import { cn } from '@/common/utils';
import { useLaunchParams } from '@/context/LaunchParamsContext';
import { useUser } from '@/context/UserContext';

import s from './SubscriptionsPage.module.scss';

const periodOrder: Record<PlanPeriod, number> = {
  [PlanPeriod.Day]: 0,
  [PlanPeriod.Month]: 1,
  [PlanPeriod.Year]: 2,
};

const DISCOUNTS = [0, 0.25, 0.5, 0.75] as const;

function getDiscount(index: number) {
  return DISCOUNTS[Math.min(index, DISCOUNTS.length - 1)] ?? 0;
}

function getPeriodDays(plan: IPlan) {
  const count = plan.periodCount ?? 1;
  if (plan.period === PlanPeriod.Day) return count;
  if (plan.period === PlanPeriod.Year) return count * 365;
  return count * 30;
}

function getOriginalPrice(price: number, discount: number) {
  if (discount <= 0) return null;
  return Math.round(price / (1 - discount));
}

function getPricePerDay(plan: IPlan) {
  const days = getPeriodDays(plan);
  if (days <= 0) return plan.price;
  return Math.round(plan.price / days);
}

function formatTitle(plan: IPlan) {
  const count = plan.periodCount ?? 1;
  return `${count} ${plan.period === PlanPeriod.Day ? 'Day' : plan.period === PlanPeriod.Month ? 'Month' : 'Year'}${count === 1 ? '' : 's'}`;
}

function getSubtitle(plan: IPlan, index: number) {
  if (plan.isRecommended) return 'Premium';
  if (index === 0) return 'Trial';
  if (plan.period === PlanPeriod.Year) return 'Elite';
  return 'Standard';
}

function getFeatureList(plan: IPlan) {
  if (plan.period === PlanPeriod.Day) {
    return ['Unlimited Chats', 'Explicit Content Access'];
  }

  if (plan.period === PlanPeriod.Month && plan.periodCount === 1) {
    return [
      'Unlimited Chats',
      'Explicit Content Access',
      'Hotter Videos',
    ];
  }

  if (plan.period === PlanPeriod.Month && plan.periodCount === 3) {
    return [
      'Unlimited Chats',
      'Explicit Content Access',
      'Hotter Videos',
      'Priority Response Speed',
    ];
  }

  return [
    'Unlimited Chats',
    'Explicit Content Access',
    'Hotter Videos',
    'Premium Scenarios',
  ];
}

function getRemainingLabel(subscribedUntil?: string | null) {
  if (!subscribedUntil) return null;

  const end = Date.parse(subscribedUntil);
  if (Number.isNaN(end)) return null;

  const remainingMs = end - Date.now();
  if (remainingMs <= 0) return null;

  const remainingDays = Math.ceil(remainingMs / 86_400_000);
  return `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`;
}

export function SubscriptionsPage() {
  const launchParams = useLaunchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const returnTo = searchParams.get('returnTo');

  const {
    data: plans = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['plans', PlanType.Subscription],
    queryFn: () => getPlans(PlanType.Subscription),
    select: (data) =>
      [...data].sort((a, b) => {
        const orderA = a.period ? periodOrder[a.period] : 0;
        const orderB = b.period ? periodOrder[b.period] : 0;
        const orderDiff = orderA - orderB;
        if (orderDiff !== 0) return orderDiff;
        return (a.periodCount ?? 0) - (b.periodCount ?? 0);
      }),
  });

  useEffect(() => {
    const recommended = plans.find((plan) => plan.isRecommended) ?? plans[0];
    if (recommended && !selectedId) {
      setSelectedId(recommended.id);
    }
  }, [plans, selectedId]);

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    };

    TelegramWebApp.onEvent('invoiceClosed', handler);
    return () => {
      TelegramWebApp.offEvent('invoiceClosed', handler);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!selectedId) return;

    const rafId = window.requestAnimationFrame(() => {
      const element = document.querySelector(
        `[data-plan-id="${selectedId}"]`,
      ) as HTMLElement | null;

      element?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [selectedId]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedId) ?? plans[0],
    [plans, selectedId],
  );

  const remainingLabel = getRemainingLabel(user?.subscribedUntil);

  const handleCheckout = () => {
    if (!selectedPlan) return;

    void (async () => {
      try {
        const invoiceLink = await createPlanInvoice(
          selectedPlan.id,
          launchParams,
        );
        TelegramWebApp.openInvoice(invoiceLink, (status) => {
          if (status === 'paid') {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            if (returnTo?.startsWith('/')) {
              navigate(returnTo);
            }
          }
        });
      } catch (error) {
        console.error(error);
      }
    })();
  };

  if (isLoading) {
    return <div className={s.empty}>Assembling premium access...</div>;
  }

  if (isError) {
    return (
      <div className={s.empty}>
        {error instanceof Error
          ? error.message
          : 'Failed to load subscriptions'}
      </div>
    );
  }

  return (
    <>
      <div className={s.page}>
        <section className={s.hero}>
          {remainingLabel ? (
            <div className={s.status}>{remainingLabel}</div>
          ) : null}
          <h1 className={s.title}>
            Elevate Your
            <br />
            <span className={s.titleAccent}>Digital Aura</span>
          </h1>
          <p className={s.description}>
            Unlock exclusive content, faster responses, and intimate
            high-fidelity moments.
          </p>
        </section>

        <div className={s.stack}>
          {plans.map((plan, index) => {
            const isRecommended = plan.isRecommended;
            const isSelected = plan.id === selectedPlan?.id;
            const discount = getDiscount(index);
            const originalPrice = getOriginalPrice(plan.price, discount);
            const pricePerDay = getPricePerDay(plan);
            const savePercent = Math.round(discount * 100);

            return (
              <div
                key={plan.id}
                className={cn(s.planWrap, [], {
                  [s.planWrapFeatured]: isRecommended,
                })}
              >
                {isRecommended ? (
                  <span className={s.featuredBadge}>Most Popular</span>
                ) : null}
                <button
                  type="button"
                  className={cn(isRecommended ? s.planFeatured : s.plan, [], {
                    [s.planSelected]: isSelected,
                  })}
                  data-plan-id={plan.id}
                  onClick={() => setSelectedId(plan.id)}
                  aria-pressed={isSelected}
                >
                  <div className={s.planHead}>
                    <div>
                      <h2 className={s.planTitle}>{formatTitle(plan)}</h2>
                      <div className={s.planSubtitle}>
                        {getSubtitle(plan, index)}
                      </div>
                    </div>
                    <div className={s.planPriceBlock}>
                      <div className={s.planPriceRow}>
                        {originalPrice != null ? (
                          <span className={s.planStrike}>
                            <TgStarWhiteIcon className={s.planStrikeIcon} />
                            <span>{originalPrice}</span>
                          </span>
                        ) : null}
                        <TgStarWhiteIcon className={s.planPriceIcon} />
                        <div className={s.planPrice}>{plan.price}</div>
                      </div>
                      {savePercent > 0 ? (
                        <span className={s.planSave}>SAVE {savePercent}%</span>
                      ) : null}
                    </div>
                  </div>

                  <div className={s.planMeta}>
                    <span className={s.planAir}>
                      <SparklesIcon className={s.planAirIcon} aria-hidden />
                      <span>+{plan.air} Credits</span>
                    </span>
                    <span className={s.planPerDay}>
                      <TgStarWhiteIcon className={s.planPerDayIcon} />
                      <span>{pricePerDay} / day</span>
                    </span>
                  </div>

                  <div className={s.featureList}>
                    {getFeatureList(plan).map((feature) => (
                      <div key={feature} className={s.feature}>
                        <span
                          className={`material-symbols-outlined filled ${s.featureIcon}`}
                        >
                          verified
                        </span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isRecommended ? (
                    <div className={s.lockedPreview}>
                      <img src={oliviaImage} alt="" />
                      <div className={s.lockedOverlay}>
                        <span
                          className={`material-symbols-outlined filled ${s.lockedIcon}`}
                        >
                          lock
                        </span>

                        <span>Unlock Full Intimacy</span>
                      </div>
                    </div>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>

        {/*<section className={s.trust}>*/}
        {/*  <div className={s.trustItem}>*/}
        {/*    <span className={`material-symbols-outlined ${s.trustIcon}`}>*/}
        {/*      lock*/}
        {/*    </span>*/}
        {/*    <span>Secure</span>*/}
        {/*  </div>*/}
        {/*  <div className={s.trustItem}>*/}
        {/*    <span className={`material-symbols-outlined ${s.trustIcon}`}>*/}
        {/*      speed*/}
        {/*    </span>*/}
        {/*    <span>Instant</span>*/}
        {/*  </div>*/}
        {/*  <div className={s.trustItem}>*/}
        {/*    <span className={`material-symbols-outlined ${s.trustIcon}`}>*/}
        {/*      workspace_premium*/}
        {/*    </span>*/}
        {/*    <span>Premium</span>*/}
        {/*  </div>*/}
        {/*</section>*/}
      </div>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <button type="button" className={s.cta} onClick={handleCheckout}>
            Claim Access
            <SparklesIcon className={s.ctaIcon} aria-hidden />
          </button>
        </div>
      </footer>
    </>
  );
}
