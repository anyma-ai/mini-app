import { useQuery, useQueryClient } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { createPlanInvoice } from '@/api/payments';
import { getPlanBundles, isNoBundlesError } from '@/api/plans';
import { SparklesIcon, TgStarWhiteIcon } from '@/assets/icons';
import { type IGift, type IPlan, PlanType } from '@/common/types';
import { cn, comparePlansByPeriod, formatPlanPeriod } from '@/common/utils';
import { useLaunchParams } from '@/context/LaunchParamsContext';

import s from './BundlesPage.module.scss';

const BUNDLE_DISCOUNTS = [57, 63, 73, 73];

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

  const units = [
    { value: Math.floor(remainingMs / 3_600_000), label: t('bundles.hours') },
    {
      value: Math.floor((remainingMs % 3_600_000) / 60_000),
      label: t('bundles.minutes'),
    },
    {
      value: Math.floor((remainingMs % 60_000) / 1000),
      label: t('bundles.seconds'),
    },
  ];

  return (
    <section className={s.timerWrap}>
      <span className={s.timerBadge}>{t('bundles.limitedOffer')}</span>
      <div className={s.timerCard}>
        {units.map(({ value, label }, index) => (
          <Fragment key={label}>
            {index > 0 ? (
              <span className={s.timerColon} aria-hidden>
                :
              </span>
            ) : null}
            <div className={s.timerUnit}>
              <span className={s.timerValue}>
                {String(value).padStart(2, '0')}
              </span>
              <span className={s.timerLabel}>{label}</span>
            </div>
          </Fragment>
        ))}
      </div>
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

  const renderItem = ({ plan, discount, oldPrice, gifts }: BundleItem) => {
    const isSelected = plan.id === selectedItem.plan.id;

    return (
      <button
        type="button"
        key={plan.id}
        className={cn(s.card, [], { [s.cardSelected]: isSelected })}
        data-plan-id={plan.id}
        aria-pressed={isSelected}
        onClick={() => setSelectedId(plan.id)}
      >
        {isSelected ? (
          <div className={s.cardBanner}>{t('bundles.onlyHere')}</div>
        ) : null}

        <div className={s.cardBody}>
          <div className={s.row}>
            <span className={s.rowIcon}>
              <span
                className={`material-symbols-outlined filled ${s.rowSymbol}`}
              >
                workspace_premium
              </span>
            </span>
            <div className={s.rowCopy}>
              <div className={cn(s.rowTitle, [s.rowTitleAccent])}>
                {t('bundles.premium', { period: formatPlanPeriod(plan, t) })}
              </div>
              <div className={s.rowDescription}>
                {t('bundles.premiumDescription')}
              </div>
            </div>
          </div>

          <div className={s.row}>
            <span className={s.rowIcon}>
              <SparklesIcon className={s.rowSvg} aria-hidden />
            </span>
            <div className={s.rowCopy}>
              <div className={s.rowTitle}>
                {t('bundles.credits', { air: plan.air })}
              </div>
              <div className={s.rowDescription}>
                {t('bundles.creditsDescription')}
              </div>
            </div>
          </div>

          {gifts.map((gift) => (
            <div className={s.row} key={gift.id}>
              <span className={s.rowIcon}>
                <img
                  src={gift.imgUrl}
                  alt=""
                  className={s.rowImage}
                  draggable={false}
                />
              </span>
              <div className={s.rowCopy}>
                <div className={cn(s.rowTitle, [s.singleLine])}>
                  {gift.name}
                </div>
                <div className={cn(s.rowDescription, [s.singleLine])}>
                  {gift.description}
                </div>
              </div>
            </div>
          ))}

          <div className={s.cardPrice}>
            <div className={s.priceRow}>
              <span className={s.strike}>
                <TgStarWhiteIcon className={s.strikeIcon} />
                <span>{oldPrice}</span>
              </span>
              <span className={s.priceMain}>
                <TgStarWhiteIcon className={s.priceIcon} />
                <span className={s.price}>{plan.price}</span>
              </span>
            </div>
            {discount > 0 ? (
              <span className={s.discount}>-{discount}%</span>
            ) : null}
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <div className={s.page}>
        <BundleCountdown
          expiresAt={data.expiresAt}
          onExpire={redirectToSubscriptions}
        />

        <div className={s.columns}>
          {[0, 1].map((column) => (
            <div className={s.column} key={column}>
              {items
                .filter((_, index) => index % 2 === column)
                .map(renderItem)}
            </div>
          ))}
        </div>
      </div>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerHead}>
            <div className={s.footerCopy}>
              <div className={s.footerTitle}>{t('bundles.yourChoice')}</div>
              <div className={s.footerSummary}>
                <span>
                  {t('bundles.summary', {
                    period: formatPlanPeriod(selectedItem.plan, t),
                    air: selectedItem.plan.air,
                  })}
                </span>
                {selectedItem.oldPrice > selectedItem.plan.price ? (
                  <span className={s.footerSave}>
                    {t('bundles.save', {
                      amount: selectedItem.oldPrice - selectedItem.plan.price,
                    })}
                    <TgStarWhiteIcon className={s.footerSaveIcon} />
                  </span>
                ) : null}
              </div>
            </div>
            <div className={s.footerPrice}>
              <span className={s.strike}>
                <TgStarWhiteIcon className={s.strikeIcon} />
                <span>{selectedItem.oldPrice}</span>
              </span>
              <span className={s.priceMain}>
                <TgStarWhiteIcon className={s.priceIcon} />
                <span className={s.price}>{selectedItem.plan.price}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            className={s.cta}
            onClick={handleBuy}
            disabled={isBuying}
          >
            {t('bundles.cta')}
            <SparklesIcon className={s.ctaIcon} aria-hidden />
          </button>
        </div>
      </footer>
    </>
  );
}
