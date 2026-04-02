import { useQuery, useQueryClient } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { buyGift, getGifts } from '@/api/gifts';
import { createPlanInvoice } from '@/api/payments';
import { getPlans } from '@/api/plans';
import { PlanType, type IGift, type IPlan } from '@/common/types';
import { useLaunchParams } from '@/context/LaunchParamsContext';
import { useUser } from '@/context/UserContext';

import s from './ShopPage.module.scss';

function getPackMeta(plan: IPlan, index: number) {
  if (plan.isRecommended) return 'Most Popular';
  if (index === 0) return 'Essential';
  if (index === 1) return 'Premier';
  return 'Elite';
}

export function ShopPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const launchParams = useLaunchParams();
  const { user } = useUser();
  const [buyingGiftId, setBuyingGiftId] = useState<string | null>(null);

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

  const featuredPlan = useMemo(
    () => plans.find((plan) => plan.isRecommended) ?? plans[1] ?? plans[0],
    [plans],
  );

  const orderedPlans = useMemo(() => {
    if (!featuredPlan) return plans;
    return [featuredPlan, ...plans.filter((plan) => plan.id !== featuredPlan.id)];
  }, [featuredPlan, plans]);

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
        block: 'start',
      });
      return;
    }

    void (async () => {
      try {
        setBuyingGiftId(gift.id);
        await buyGift(gift.id);
        queryClient.invalidateQueries({ queryKey: ['gifts'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch (error) {
        console.error(error);
      } finally {
        setBuyingGiftId(null);
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

  if (giftsLoading || plansLoading) {
    return <div className={s.empty}>Opening the boutique...</div>;
  }

  if (hasError) {
    return <div className={s.empty}>{errorMessage}</div>;
  }

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1 className={s.title}>The Boutique</h1>
        <p className={s.description}>
          Enhance your connection with exclusive credits, curated gifts, and the
          rarest Aura access.
        </p>
      </section>

      <section className={s.section} id="credit-packs">
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>Credit Packs</h2>
          <div className={s.sectionMeta}>Best Value</div>
        </div>

        <div className={`${s.packs} app-hide-scrollbar`}>
          {orderedPlans.map((plan, index) => {
            const isFeatured = plan.id === featuredPlan?.id;

            return (
              <article
                key={plan.id}
                className={isFeatured ? s.packFeatured : s.pack}
              >
                <div>
                  <div className={s.packMeta}>{getPackMeta(plan, index)}</div>
                  <div className={s.packAmountRow}>
                    <span className={s.packAmount}>{plan.air}</span>
                    <span className={s.packLabel}>Credits</span>
                  </div>
                </div>

                <div className={s.packFooter}>
                  <span className={s.packPrice}>{plan.price}</span>
                  <button
                    type="button"
                    className={s.packButton}
                    onClick={() => handlePlanPurchase(plan)}
                  >
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
          <h2 className={s.sectionTitle}>Virtual Gifts</h2>
          <button
            type="button"
            className={s.sectionAction}
            onClick={() => navigate('/subscriptions')}
          >
            Premium Access
          </button>
        </div>

        <div className={s.gifts}>
          {gifts.map((gift) => (
            <article key={gift.id} className={s.gift}>
              <div className={s.giftMedia}>
                <img src={gift.imgUrl} alt={gift.name} className={s.giftImage} />
              </div>
              <div className={s.giftBody}>
                <h3 className={s.giftName}>{gift.name}</h3>
                <p className={s.giftDescription}>{gift.description}</p>
                <button
                  type="button"
                  className={`${s.giftButton} ${gift.isBought ? s.giftOwned : ''}`}
                  onClick={() => handleGiftPurchase(gift)}
                >
                  <span className="material-symbols-outlined filled">auto_awesome</span>
                  {gift.isBought ? 'Owned' : `${gift.price}`}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={s.membershipCard}>
        <div className={s.membershipBody}>
          <h2 className={s.membershipTitle}>Aura Infinite</h2>
          <p className={s.membershipCopy}>
            Unlimited intimacy points, daily free credits, and access to locked
            story paths.
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
    </div>
  );
}
