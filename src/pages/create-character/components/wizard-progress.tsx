import { cn } from '@/common/utils';

import { WIZARD_STEPS } from '../create-character.data';
import styles from '../create-character.module.scss';

export function WizardProgress({
  activeIndex,
  onStepClick,
}: {
  activeIndex: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <div
      aria-label="Create character progress"
      className={styles.stepProgress}
      role="group"
    >
      {WIZARD_STEPS.map((step, index) => {
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
              aria-label={`Go to ${step.title}`}
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
