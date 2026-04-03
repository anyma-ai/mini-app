import type { IStory } from '@/common/types';

import { apiFetch } from './client';

export interface IStoriesResponse {
  seenStories: string[];
  stories: IStory[];
}

export async function getStories(): Promise<IStoriesResponse> {
  const response = await apiFetch('/characters/stories');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load stories');
  }

  return (await response.json()) as IStoriesResponse;
}

export async function markStorySeen(storyId: string): Promise<void> {
  const response = await apiFetch(`/characters/stories/${storyId}/seen`, {
    method: 'POST',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to mark story as seen');
  }
}
