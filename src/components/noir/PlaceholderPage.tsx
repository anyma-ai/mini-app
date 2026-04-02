import { useNavigate } from 'react-router-dom';

import s from './PlaceholderPage.module.scss';

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryPath: string;
  secondaryLabel?: string;
  secondaryPath?: string;
  cardTitle: string;
  cardCopy: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryPath,
  secondaryLabel,
  secondaryPath,
  cardTitle,
  cardCopy,
}: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <div className={s.eyebrow}>{eyebrow}</div>
        <h1 className={s.title}>
          <span className={s.gradient}>{title}</span>
        </h1>
        <p className={s.description}>{description}</p>
      </section>

      <section className={s.card}>
        <div className={s.cardBody}>
          <h2 className={s.cardTitle}>{cardTitle}</h2>
          <p className={s.copy}>{cardCopy}</p>
          <div className={s.actions}>
            <button
              type="button"
              className={`${s.button} ${s.primary}`}
              onClick={() => navigate(primaryPath)}
            >
              {primaryLabel}
            </button>
            {secondaryLabel && secondaryPath ? (
              <button
                type="button"
                className={`${s.button} ${s.secondary}`}
                onClick={() => navigate(secondaryPath)}
              >
                {secondaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
