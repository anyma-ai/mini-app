import type { CSSProperties } from "react";
import { useTranslation } from 'react-i18next';

import { MAX_AGE, MIN_AGE } from "../create-character.data";
import styles from "../create-character.module.scss";

export function AgeControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (age: number) => void;
}) {
  const { t } = useTranslation();
  const setAge = (nextAge: number) => {
    onChange(Math.min(MAX_AGE, Math.max(MIN_AGE, nextAge)));
  };

  return (
    <div className={styles.ageControl}>
      <button
        aria-label={t('createCharacter.aria.decreaseAge', {
          defaultValue: 'Decrease age',
        })}
        disabled={value <= MIN_AGE}
        type="button"
        onClick={() => setAge(value - 1)}
      >
        -
      </button>
      <div className={styles.ageValue} aria-live="polite">
        {value}
      </div>
      <button
        aria-label={t('createCharacter.aria.increaseAge', {
          defaultValue: 'Increase age',
        })}
        disabled={value >= MAX_AGE}
        type="button"
        onClick={() => setAge(value + 1)}
      >
        +
      </button>
      <input
        aria-label={t('common.age')}
        max={MAX_AGE}
        min={MIN_AGE}
        style={{ "--age-progress": `${((value - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100}%` } as CSSProperties}
        type="range"
        value={value}
        onChange={(event) => setAge(Number(event.target.value))}
      />
    </div>
  );
}
