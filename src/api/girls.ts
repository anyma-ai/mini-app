import type { CharacterType, ICharacter, Paginated } from '@/common/types';

import { apiFetch } from './client';

export type CharacterListQuery = {
  skip?: number;
  take?: number;
  type?: CharacterType;
};

function buildListQuery(params: CharacterListQuery = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function getGirls(type?: CharacterType): Promise<ICharacter[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  const response = await apiFetch(`/characters${query}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load characters');
  }

  const data = (await response.json()) as ICharacter[] | { data: ICharacter[] };
  if (Array.isArray(data)) {
    return data;
  }

  return data.data;
}

export async function getCharacters(
  params: CharacterListQuery = {},
): Promise<Paginated<ICharacter>> {
  const response = await apiFetch(`/characters${buildListQuery(params)}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load characters');
  }

  const data = (await response.json()) as
    | ICharacter[]
    | Paginated<ICharacter>
    | { data: ICharacter[] | Paginated<ICharacter> };

  if (Array.isArray(data)) {
    return {
      data,
      total: data.length,
      skip: params.skip ?? 0,
      take: params.take ?? data.length,
    };
  }

  if (
    'total' in data &&
    typeof data.total === 'number' &&
    Array.isArray(data.data)
  ) {
    return data;
  }

  if (
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data) &&
    'total' in data.data &&
    typeof data.data.total === 'number'
  ) {
    return data.data;
  }

  if (Array.isArray(data.data)) {
    return {
      data: data.data,
      total: data.data.length,
      skip: params.skip ?? 0,
      take: params.take ?? data.data.length,
    };
  }

  return data.data;
}
