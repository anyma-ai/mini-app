import type {
  CreateCharacterDto,
  CreateCharacterScenarioDto,
  ICharacter,
} from '@/common/types';

import { apiFetch } from './client';

function parseCharacterList(
  data: ICharacter[] | { data: ICharacter[] },
): ICharacter[] {
  if (Array.isArray(data)) {
    return data;
  }

  return data.data;
}

export async function getCustomCharacters(): Promise<ICharacter[]> {
  const response = await apiFetch('/custom-characters');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load custom characters');
  }

  return parseCharacterList(
    (await response.json()) as ICharacter[] | { data: ICharacter[] },
  );
}

export async function createCustomCharacter(
  payload: CreateCharacterDto,
): Promise<ICharacter> {
  const response = await apiFetch('/custom-characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to create character');
  }

  return (await response.json()) as ICharacter;
}

export async function createCharacterScenario(
  characterId: string,
  payload: CreateCharacterScenarioDto,
): Promise<ICharacter> {
  const response = await apiFetch(`/custom-characters/${characterId}/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to create scenario');
  }

  return (await response.json()) as ICharacter;
}
