import { useQuery, useQueryClient } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { createPlanInvoice } from '@/api/payments';
import { getPlanBundles, isNoBundlesError } from '@/api/plans';
import { SparklesIcon, TgStarWhiteIcon } from '@/assets/icons';
import { type IGift, type IPlan, PlanType } from '@/common/types';
import { cn, comparePlansByPeriod, formatPlanPeriod } from '@/common/utils';
import { useLaunchParams } from '@/context/LaunchParamsContext';

import s from './BundlesPage.module.scss';

const BUNDLE_DISCOUNTS = [50, 60, 70, 75];

type BundleItem = {
  plan: IPlan;
  discount: number;
  oldPrice: number;
  gifts: IGift[];
};

function getOldPrice(price: number, discount: number) {
  if (discount <= 0) return price;
  return Math.round(price / (1 - discount / 100));
}

function getRemainingMs(expiresAt: string, now: number) {
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end)) return 0;

  return Math.max(0, end - now);
}

function formatCountdown(ms: number) {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

type BundleCountdownProps = {
  expiresAt: string;
  onExpire: () => void;
};

function BundleCountdown({ expiresAt, onExpire }: BundleCountdownProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const remainingMs = getRemainingMs(expiresAt, now);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (remainingMs <= 0) onExpire();
  }, [onExpire, remainingMs]);

  return (
    <section className={s.hero}>
      <div className={s.heroCopy}>
        <span className={s.timerLabel}>
          <span className={`material-symbols-outlined filled ${s.timerIcon}`}>
            bolt
          </span>
          {t('bundles.limitedOffer')}
        </span>
        <p className={s.heroNote}>{t('bundles.onlyHere')}</p>
      </div>
      <span className={s.timerValue}>{formatCountdown(remainingMs)}</span>
    </section>
  );
}

export function BundlesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const launchParams = useLaunchParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['plans', PlanType.Bundle],
    queryFn: getPlanBundles,
    retry: (failureCount, queryError) =>
      !isNoBundlesError(queryError) && failureCount < 3,
    select: (bundles) => ({
      ...bundles,
      plans: [...bundles.plans].sort(comparePlansByPeriod),
    }),
  });

  const hasNoBundles = isNoBundlesError(error);

  const redirectToSubscriptions = useCallback(() => {
    navigate('/subscriptions', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (hasNoBundles) redirectToSubscriptions();
  }, [hasNoBundles, redirectToSubscriptions]);

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    };

    TelegramWebApp.onEvent('invoiceClosed', handler);
    return () => {
      TelegramWebApp.offEvent('invoiceClosed', handler);
    };
  }, [queryClient]);

  const items: BundleItem[] = (data?.plans ?? []).map((plan, index) => {
    const discount = BUNDLE_DISCOUNTS[index] ?? 0;

    return {
      plan,
      discount,
      oldPrice: getOldPrice(plan.price, discount),
      gifts: (plan.bundle?.gifts ?? []).flatMap((giftId) =>
        (data?.gifts ?? []).filter((gift) => gift.id === giftId),
      ),
    };
  });

  const selectedItem =
    items.find((item) => item.plan.id === selectedId) ??
    items.find((item) => item.plan.isRecommended) ??
    items[0];

  const handleBuy = () => {
    if (!selectedItem || isBuying) return;

    void (async () => {
      setIsBuying(true);
      try {
        const invoiceLink = await createPlanInvoice(
          selectedItem.plan.id,
          launchParams,
        );
        TelegramWebApp.openInvoice(invoiceLink, (status) => {
          if (status === 'paid') {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            queryClient.invalidateQueries({
              queryKey: ['plans', PlanType.Bundle],
            });
            navigate('/explore', { replace: true });
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsBuying(false);
      }
    })();
  };

  if (isLoading || hasNoBundles) {
    return <div className={s.empty}>{t('bundles.loading')}</div>;
  }

  if (error || !data || !selectedItem) {
    return (
      <div className={s.empty}>
        {error instanceof Error && error.message
          ? error.message
          : t('bundles.failed')}
      </div>
    );
  }

  const savings = selectedItem.oldPrice - selectedItem.plan.price;

  return (
    <>
      <div className={s.page}>
        <BundleCountdown
          expiresAt={data.expiresAt}
          onExpire={redirectToSubscriptions}
        />

        <div className={s.stack}>
          {items.map(({ plan, discount, oldPrice, gifts }) => {
            const isSelected = plan.id === selectedItem.plan.id;

            return (
              <div
                key={plan.id}
                className={cn(s.cardWrap, [], {
                  [s.cardWrapFeatured]: plan.isRecommended,
                })}
              >
                {plan.isRecommended ? (
                  <span className={s.cardBadge}>{t('shop.mostPopular')}</span>
                ) : null}
                <button
                  type="button"
                  className={cn(s.card, [], { [s.cardSelected]: isSelected })}
                  data-plan-id={plan.id}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(plan.id)}
                >
                  <div className={s.cardHead}>
                    <span
                      className={`material-symbols-outlined filled ${s.cardTitleIcon}`}
                    >
                      diamond
                    </span>
                    <span className={s.cardTitle}>
                      {t('bundles.premium', {
                        period: formatPlanPeriod(plan, t),
                      })}
                    </span>
                  </div>

                  <div className={s.cardBottom}>
                    <div className={s.cardMeta}>
                      <span className={s.metaItem}>
                        <SparklesIcon className={s.metaIcon} aria-hidden />
                        <span>{t('bundles.credits', { air: plan.air })}</span>
                      </span>
                      {gifts.map((gift) => (
                        <span className={s.metaItem} key={gift.id}>
                          <img
                            src={gift.imgUrl}
                            alt=""
                            className={s.metaImage}
                            draggable={false}
                          />
                          <span className={s.metaText}>{gift.name}</span>
                        </span>
                      ))}
                    </div>

                    <div className={s.cardPrice}>
                      <span className={s.strike}>
                        <TgStarWhiteIcon className={s.strikeIcon} />
                        <span>{oldPrice}</span>
                      </span>
                      <span className={s.priceMain}>
                        <TgStarWhiteIcon className={s.priceIcon} />
                        <span className={s.price}>{plan.price}</span>
                      </span>
                      {discount > 0 ? (
                        <span className={s.ribbon}>
                          <span className={s.discount}>-{discount}%</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerSummary}>
            <span className={s.footerText}>
              {t('bundles.summary', {
                period: formatPlanPeriod(selectedItem.plan, t),
                air: selectedItem.plan.air,
              })}
            </span>
            {savings > 0 ? (
              <span className={s.footerSave}>
                {t('bundles.save', { amount: savings })}
                <TgStarWhiteIcon className={s.footerSaveIcon} />
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className={s.cta}
            onClick={handleBuy}
            disabled={isBuying}
          >
            <span>{t('bundles.cta')}</span>
            <span className={s.ctaDot} aria-hidden />
            <span className={s.ctaPrice}>
              <TgStarWhiteIcon className={s.ctaIcon} />
              {selectedItem.plan.price}
            </span>
          </button>
        </div>
      </footer>
    </>
  );
}
