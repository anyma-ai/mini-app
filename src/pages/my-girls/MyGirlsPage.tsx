import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { getCustomCharacters } from '@/api/custom-character';
import type { ICharacter } from '@/common/types';

import s from './MyGirlsPage.module.scss';

function getCardImage(girl: ICharacter) {
  return girl.promoImgUrl || girl.avatarUrl;
}

export function MyGirlsPage() {
  const navigate = useNavigate();
  const {
    data: girls = [],
    isLoading,
    isError,
    error,
    isFetched,
  } = useQuery({
    queryKey: ['custom-characters'],
    queryFn: getCustomCharacters,
  });

  useEffect(() => {
    if (isFetched && !isLoading && !isError && girls.length === 0) {
      navigate('/create-character', { replace: true });
    }
  }, [girls.length, isError, isFetched, isLoading, navigate]);

  if (isLoading) {
    return <div className={s.empty}>Loading your girls...</div>;
  }

  if (isError) {
    return (
      <div className={s.empty}>
        {error instanceof Error ? error.message : 'Failed to load characters'}
      </div>
    );
  }

  if (girls.length === 0) {
    return <div className={s.empty}>Opening create flow...</div>;
  }

  return (
    <div className={s.page}>
      <section className={s.grid}>
        {girls.map((girl) => (
          <button
            key={girl.id}
            type="button"
            className={s.tile}
            onClick={() => navigate(`/companions/${girl.id}?isCustom=1`)}
          >
            <img
              src={getCardImage(girl)}
              alt={girl.name}
              className={s.cardImage}
            />
            <div className={s.cardOverlay} />
            <div className={s.cardBody}>
              <div className={s.tileFooter}>
                <div>
                  <h3 className={s.cardTitle}>{girl.name}</h3>
                  <div className={s.mood}>{girl.description}</div>
                </div>
                <span className={s.secondaryAction}>Chat Now</span>
              </div>
            </div>
          </button>
        ))}

        <button
          type="button"
          className={`${s.tile} ${s.createGirl}`}
          onClick={() => navigate('/create-character')}
        >
          <div className={s.createGirlBody}>
            <span className={s.createGirlIcon} aria-hidden="true">
              <span className="material-symbols-outlined filled">
                auto_awesome
              </span>
            </span>
            <h3 className={s.createGirlTitle}>New Girl</h3>
            <p className={s.createGirlDescription}>
              Your sweet fantasy awaits you
            </p>
            <span className={s.createGirlButton}>Create New</span>
          </div>
        </button>
      </section>
    </div>
  );
}
