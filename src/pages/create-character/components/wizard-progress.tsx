import { cn } from '@/common/utils';

import { WIZARD_STEPS } from '../create-character.data';
import styles from '../create-character.module.scss';

export function WizardProgress({
  activeIndex,
  ariaLabel = 'Create character progress',
  onStepClick,
  steps = WIZARD_STEPS,
}: {
  activeIndex: number;
  ariaLabel?: string;
  onStepClick: (index: number) => void;
  steps?: typeof WIZARD_STEPS;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={styles.stepProgress}
      role="group"
    >
      {steps.map((step, index) => {
        const Icon = step.icon;
        const active = index === activeIndex;
        const complete = index < activeIndex;
        const segmentComplete = index <= activeIndex;

        return (
          <div className={styles.stepProgressItem} key={step.id}>
            {index > 0 ? (
              <span
                className={cn(styles.stepConnector, undefined, {
                  [styles.stepConnectorComplete]: segmentComplete,
                })}
              />
            ) : null}
            <button
              aria-current={active ? 'step' : undefined}
              aria-label={step.title}
              className={cn(styles.stepIcon, undefined, {
                [styles.stepIconActive]: active,
                [styles.stepIconComplete]: complete,
              })}
              type="button"
              onClick={() => onStepClick(index)}
            >
              <Icon />
            </button>
          </div>
        );
      })}
    </div>
  );
}
