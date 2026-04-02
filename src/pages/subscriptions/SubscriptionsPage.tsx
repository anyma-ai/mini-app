import { useQuery, useQueryClient } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { useEffect, useMemo, useState } from 'react';

import { createPlanInvoice } from '@/api/payments';
import { getPlans } from '@/api/plans';
import { TgStarWhiteIcon } from '@/assets/icons';
import oliviaImage from '@/assets/characters/olivia.webp';
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

function formatTitle(plan: IPlan) {
  const count = plan.periodCount ?? 1;
  return `${count} ${plan.period === PlanPeriod.Day ? 'Day' : plan.period === PlanPeriod.Month ? 'Month' : 'Year'}${count === 1 ? '' : 's'}`;
}

function getSubtitle(plan: IPlan, index: number) {
  if (plan.isRecommended) return 'Best Value Connection';
  if (index === 0) return 'Introductory Access';
  if (plan.period === PlanPeriod.Year) return 'Ultimate Devotion';
  return 'Curated Access';
}

function getFeatureList(plan: IPlan) {
  if (plan.items?.length) {
    return plan.items.map((item) => item.value);
  }

  if (plan.period === PlanPeriod.Day) {
    return ['Unlimited Chat Messages', 'Full HD Media Unlocks'];
  }

  if (plan.period === PlanPeriod.Month) {
    return [
      'Priority Response Speed',
      'Exclusive Custom Outfits',
      'Voice Message Access',
    ];
  }

  return [
    'Everything in Premium',
    'Lifetime status marker',
    'Private scene drops',
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
  const { user } = useUser();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
                    <div>
                      <div className={s.planPriceRow}>
                        <TgStarWhiteIcon className={s.planPriceIcon} />
                        <div className={s.planPrice}>{plan.price}</div>
                      </div>
                      {isRecommended ? (
                        <div className={s.planStrike}>{plan.price + 10}</div>
                      ) : null}
                    </div>
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
                        Unlock Full Intimacy
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
          </button>
        </div>
      </footer>
    </>
  );
}
