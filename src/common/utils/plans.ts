import { type IPlan, PlanPeriod } from '@/common/types';

const periodOrder: Record<PlanPeriod, number> = {
  [PlanPeriod.Day]: 0,
  [PlanPeriod.Month]: 1,
  [PlanPeriod.Year]: 2,
};

export function comparePlansByPeriod(a: IPlan, b: IPlan) {
  const orderA = a.period ? periodOrder[a.period] : 0;
  const orderB = b.period ? periodOrder[b.period] : 0;
  const orderDiff = orderA - orderB;
  if (orderDiff !== 0) return orderDiff;
  return (a.periodCount ?? 0) - (b.periodCount ?? 0);
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function formatPlanPeriod(plan: IPlan, t: Translate) {
  const count = plan.periodCount ?? 1;
  const periodKey =
    plan.period === PlanPeriod.Day
      ? 'subscriptions.period.day'
      : plan.period === PlanPeriod.Month
        ? 'subscriptions.period.month'
        : 'subscriptions.period.year';

  return t(periodKey, { count });
}
