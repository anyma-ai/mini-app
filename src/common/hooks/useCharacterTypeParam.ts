import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CharacterType } from '@/common/types';

const CHARACTER_TYPE_STORAGE_KEY = 'character-type-v1';

function isCharacterType(value: string | null): value is CharacterType {
  return value === CharacterType.Realistic || value === CharacterType.Anime;
}

export function useCharacterTypeParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawType = searchParams.get('type');

  const characterType = useMemo(
    () => (isCharacterType(rawType) ? rawType : CharacterType.Realistic),
    [rawType],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedType = window.sessionStorage.getItem(CHARACTER_TYPE_STORAGE_KEY);
    const nextType = isCharacterType(storedType) ? storedType : characterType;

    if (rawType == null || !isCharacterType(rawType)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('type', nextType);
      setSearchParams(nextParams, { replace: true });
      return;
    }

    window.sessionStorage.setItem(CHARACTER_TYPE_STORAGE_KEY, characterType);
  }, [characterType, rawType, searchParams, setSearchParams]);

  const setCharacterType = useCallback(
    (nextType: CharacterType) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('type', nextType);
      setSearchParams(nextParams, { replace: true });

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(CHARACTER_TYPE_STORAGE_KEY, nextType);
      }
    },
    [searchParams, setSearchParams],
  );

  return {
    characterType,
    setCharacterType,
  };
}
