import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { DEFAULT_DRAFT, WIZARD_STEPS } from './create-character.data';
import type { Draft } from './create-character.types';

const STORAGE_KEY = 'anyma:create-character:state:v1';

type StoredCreateCharacterState = {
  activeStepIndex: number;
  draft: Draft;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDraft(value: unknown): Draft {
  if (!isRecord(value)) {
    return DEFAULT_DRAFT;
  }

  return {
    ...DEFAULT_DRAFT,
    ...value,
    personality: Array.isArray(value.personality) ? value.personality as Draft["personality"] : DEFAULT_DRAFT.personality,
    hobbies: Array.isArray(value.hobbies) ? value.hobbies as Draft["hobbies"] : DEFAULT_DRAFT.hobbies,
    fetishes: Array.isArray(value.fetishes) ? value.fetishes as Draft["fetishes"] : DEFAULT_DRAFT.fetishes,
  };
}

function normalizeStep(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(WIZARD_STEPS.length - 1, Math.max(0, Math.trunc(value)));
}

function normalizeStoredState(value: unknown): StoredCreateCharacterState {
  if (!isRecord(value)) {
    return {
      activeStepIndex: 0,
      draft: DEFAULT_DRAFT,
    };
  }

  return {
    activeStepIndex: normalizeStep(value.activeStepIndex),
    draft: normalizeDraft(value.draft),
  };
}

export function usePersistedCreateCharacterDraft(): [
  Draft,
  Dispatch<SetStateAction<Draft>>,
  number,
  Dispatch<SetStateAction<number>>,
  () => void,
] {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedState = window.localStorage.getItem(STORAGE_KEY);

      if (storedState) {
        const nextState = normalizeStoredState(JSON.parse(storedState));

        setDraft(nextState.draft);
        setActiveStepIndex(nextState.activeStepIndex);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeStepIndex,
      draft,
    }));
  }, [activeStepIndex, draft, loaded]);

  const clearDraft = () => {
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return [draft, setDraft, activeStepIndex, setActiveStepIndex, clearDraft];
}
