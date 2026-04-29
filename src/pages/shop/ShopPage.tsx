import { useQuery, useQueryClient } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { buyGift, getGifts, sendGift } from '@/api/gifts';
import { createPlanInvoice } from '@/api/payments';
import { getPlans } from '@/api/plans';
import { TgStarWhiteIcon } from '@/assets/icons';
import { type IGift, type IPlan, PlanType } from '@/common/types';
import { cn } from '@/common/utils';
import { useLaunchParams } from '@/context/LaunchParamsContext';
import { useUser } from '@/context/UserContext';

import s from './ShopPage.module.scss';

const packNames = [
  'Quick Spark',
  'Deepening Desire',
  'Eternal Connection',
  'Unlimited Flow',
];

export function ShopPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const launchParams = useLaunchParams();
  const { user } = useUser();
  const [buyingGiftId, setBuyingGiftId] = useState<string | null>(null);
  const [sendingGiftId, setSendingGiftId] = useState<string | null>(null);
  const [highlightedGiftId, setHighlightedGiftId] = useState<string | null>(
    null,
  );
  const [pendingOwnedScrollId, setPendingOwnedScrollId] = useState<
    string | null
  >(null);

  const {
    data: gifts = [],
    isLoading: giftsLoading,
    isError: giftsError,
    error: giftsErrorValue,
  } = useQuery({
    queryKey: ['gifts'],
    queryFn: getGifts,
  });

  const {
    data: plans = [],
    isLoading: plansLoading,
    isError: plansError,
    error: plansErrorValue,
  } = useQuery({
    queryKey: ['plans', PlanType.Air],
    queryFn: () => getPlans(PlanType.Air),
    select: (data) => [...data].sort((a, b) => a.price - b.price),
  });

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
    if (!pendingOwnedScrollId) return;

    const ownedGift = gifts.find(
      (gift) => gift.id === pendingOwnedScrollId && gift.isBought,
    );
    if (!ownedGift) return;

    const rafId = window.requestAnimationFrame(() => {
      const element = document.querySelector(
        `[data-owned-gift-id="${pendingOwnedScrollId}"]`,
      ) as HTMLElement | null;

      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setPendingOwnedScrollId(null);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [gifts, pendingOwnedScrollId]);

  useEffect(() => {
    if (!location.hash || gifts.length === 0) return;

    const giftId = decodeURIComponent(
      location.hash.split('?')[0].replace('#', '').trim(),
    );
    if (!giftId) return;

    const exists = gifts.some((gift) => gift.id === giftId);
    if (!exists) return;

    let timeoutId: number | undefined;
    let retryId: number | undefined;

    const tryHighlight = (attempt: number) => {
      const element = document.querySelector(
        `[data-gift-id="${giftId}"]`,
      ) as HTMLElement | null;

      if (!element) {
        if (attempt < 3) {
          retryId = window.setTimeout(() => {
            tryHighlight(attempt + 1);
          }, 120);
        }
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedGiftId(giftId);
      timeoutId = window.setTimeout(() => {
        setHighlightedGiftId((current) => (current === giftId ? null : current));
      }, 1800);
    };

    const rafId = window.requestAnimationFrame(() => tryHighlight(0));
    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId) window.clearTimeout(timeoutId);
      if (retryId) window.clearTimeout(retryId);
    };
  }, [gifts, location.hash]);

  const featuredPlan = useMemo(
    () => plans.find((plan) => plan.isRecommended) ?? plans[1] ?? plans[0],
    [plans],
  );

  const orderedPlans = useMemo(() => {
    if (!featuredPlan) return plans;
    return [
      featuredPlan,
      ...plans.filter((plan) => plan.id !== featuredPlan.id),
    ];
  }, [featuredPlan, plans]);

  const packNameById = useMemo(() => {
    return new Map(
      plans.map((plan, index) => [
        plan.id,
        packNames[index] ?? `Credit Pack ${index + 1}`,
      ]),
    );
  }, [plans]);

  const handlePlanPurchase = (plan: IPlan) => {
    void (async () => {
      try {
        const invoiceLink = await createPlanInvoice(plan.id, launchParams);
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

  const handleGiftPurchase = (gift: IGift) => {
    if (gift.isBought || buyingGiftId === gift.id) return;

    if ((user?.air ?? 0) < gift.price) {
      document.getElementById('credit-packs')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }

    void (async () => {
      try {
        setBuyingGiftId(gift.id);
        const result = await buyGift(gift.id);

        if (!result.success) return;

        queryClient.invalidateQueries({ queryKey: ['gifts'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });

        if (result.shouldClose) {
          TelegramWebApp.close();
          return;
        }

        setPendingOwnedScrollId(gift.id);
      } catch (error) {
        console.error(error);
        setPendingOwnedScrollId(null);
      } finally {
        setBuyingGiftId(null);
      }
    })();
  };

  const handleGiftSend = (gift: IGift) => {
    if (!user?.hasActiveChat || sendingGiftId === gift.id) return;

    void (async () => {
      try {
        setSendingGiftId(gift.id);
        await sendGift(gift.id);
        queryClient.invalidateQueries({ queryKey: ['gifts'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
        TelegramWebApp.close();
      } catch (error) {
        console.error(error);
      } finally {
        setSendingGiftId(null);
      }
    })();
  };

  const hasError = giftsError || plansError;
  const errorMessage =
    giftsErrorValue instanceof Error
      ? giftsErrorValue.message
      : plansErrorValue instanceof Error
        ? plansErrorValue.message
        : 'Failed to load the boutique';
  const availableGifts = gifts.filter((gift) => !gift.isBought);
  const ownedGifts = gifts.filter((gift) => gift.isBought);

  if (giftsLoading || plansLoading) {
    return <div className={s.empty}>Opening the boutique...</div>;
  }

  if (hasError) {
    return <div className={s.empty}>{errorMessage}</div>;
  }

  return (
    <div className={s.page}>
      <section className={s.hero} id={'hero'}>
        <h1 className={s.title}>The Boutique</h1>
        <p className={s.description}>
          Enhance your connection with exclusive gifts, and the rarest SweetMe
          access.
        </p>
      </section>

      <section className={s.section} id="credit-packs">
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>Credit Packs</h2>
          <div className={s.sectionMeta}>Best Value</div>
        </div>

        <div className={`${s.packs} app-hide-scrollbar`}>
          {orderedPlans.map((plan) => {
            const isFeatured = plan.id === featuredPlan?.id;

            return (
              <article
                key={plan.id}
                className={isFeatured ? s.packFeatured : s.pack}
                onClick={() => handlePlanPurchase(plan)}
              >
                <div>
                  <div className={s.packMeta}>
                    {packNameById.get(plan.id) ?? 'Credit Pack'}
                  </div>
                  <div className={s.packAmountRow}>
                    <span className={s.packAmount}>{plan.air}</span>
                    <span className={s.packLabel}>Credits</span>
                  </div>
                </div>

                <div className={s.packFooter}>
                  <div className={s.packPriceRow}>
                    <TgStarWhiteIcon className={s.packPriceIcon} />
                    <span className={s.packPrice}>{plan.price}</span>
                  </div>
                  <button type="button" className={s.packButton}>
                    <span className="material-symbols-outlined">
                      {isFeatured ? 'payments' : 'add'}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>Gifts</h2>
          <button
            type="button"
            className={s.sectionAction}
            onClick={() => navigate('/subscriptions')}
          >
            Premium Access
          </button>
        </div>

        <div className={s.gifts}>
          {availableGifts.map((gift) => (
            <article
              key={gift.id}
              className={cn(s.gift, [
                highlightedGiftId === gift.id ? s.highlighted : '',
              ])}
              data-gift-id={gift.id}
            >
              <div className={s.giftMedia}>
                <img
                  src={gift.imgUrl}
                  alt={gift.name}
                  className={s.giftImage}
                />
              </div>
              <div className={s.giftBody}>
                <h3 className={s.giftName}>{gift.name}</h3>
                <p className={s.giftDescription}>{gift.description}</p>
                <button
                  type="button"
                  className={`${s.giftButton} ${gift.isBought ? s.giftOwned : ''}`}
                  onClick={() => handleGiftPurchase(gift)}
                >
                  <span
                    className={cn('material-symbols-outlined filled', [
                      s.pillIcon,
                    ])}
                  >
                    auto_awesome
                  </span>
                  {gift.isBought ? 'Owned' : `${gift.price}`}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {ownedGifts.length > 0 ? (
        <section className={s.section}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Owned Gifts</h2>
            <div className={s.sectionMeta}>Collected</div>
          </div>

          <div className={s.gifts}>
            {ownedGifts.map((gift) => (
              <article
                key={gift.id}
                className={cn(s.gift, [
                  highlightedGiftId === gift.id ? s.highlighted : '',
                ])}
                data-gift-id={gift.id}
                data-owned-gift-id={gift.id}
              >
                <div className={s.giftMedia}>
                  <img
                    src={gift.imgUrl}
                    alt={gift.name}
                    className={s.giftImage}
                  />
                </div>
                <div className={s.giftBody}>
                  <h3 className={s.giftName}>{gift.name}</h3>
                  <p className={s.giftDescription}>{gift.description}</p>
                  <button
                    type="button"
                    className={`${s.giftButton} ${s.giftOwned}`}
                    onClick={() => handleGiftSend(gift)}
                    disabled={!user?.hasActiveChat || sendingGiftId === gift.id}
                  >
                    <span className="material-symbols-outlined filled">
                      auto_awesome
                    </span>
                    {user?.hasActiveChat ? 'Gift' : 'Owned'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!user?.isSubscribed && (
        <section className={s.membershipCard}>
          <div className={s.membershipBody}>
            <h2 className={s.membershipTitle}>SweetMe Infinite</h2>
            <p className={s.membershipCopy}>
              Unlimited intimacy points, daily free credits, and access to
              locked story paths.
            </p>
            <button
              type="button"
              className={s.membershipButton}
              onClick={() => navigate('/subscriptions')}
            >
              Unlock Membership
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
