import type { IStory } from '@/common/types';

export type ExploreStory = IStory & {
  character: {
    age?: number;
    avatarUrl: string;
    id: string;
    name: string;
    promoImgUrl?: string | null;
  };
  isSeen: boolean;
};

export type StoryGroup = {
  character: ExploreStory['character'];
  stories: ExploreStory[];
};

export type StoryViewerState = {
  characterId: string;
  storyIndex: number;
};

export function groupStories(stories: ExploreStory[]) {
  const groups = new Map<string, StoryGroup>();

  for (const story of stories) {
    const characterId = story.character.id;
    const existingGroup = groups.get(characterId);

    if (existingGroup) {
      existingGroup.stories.push(story);
      continue;
    }

    groups.set(characterId, {
      character: story.character,
      stories: [story],
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    stories: [...group.stories].sort((left, right) => left.idx - right.idx),
  }));
}

export function sortStoryGroupsByUnseen(groups: StoryGroup[]) {
  return [...groups]
    .map((group, index) => ({ group, index }))
    .sort((left, right) => {
      const leftHasUnseen = left.group.stories.some((story) => !story.isSeen);
      const rightHasUnseen = right.group.stories.some((story) => !story.isSeen);

      if (leftHasUnseen !== rightHasUnseen) {
        return leftHasUnseen ? -1 : 1;
      }

      return left.index - right.index;
    })
    .map(({ group }) => group);
}

export function getInitialStoryIndex(group: StoryGroup) {
  const firstUnseenIndex = group.stories.findIndex((story) => !story.isSeen);

  return firstUnseenIndex >= 0 ? firstUnseenIndex : 0;
}

export function getCurrentStory(
  groups: StoryGroup[],
  viewer: StoryViewerState,
) {
  const group = groups.find(
    (item) => item.character.id === viewer.characterId,
  );

  if (!group) {
    return null;
  }

  const story = group.stories[viewer.storyIndex];
  return story ? { group, story } : null;
}

export function moveStoryViewer(
  groups: StoryGroup[],
  viewer: StoryViewerState,
  direction: 'next' | 'previous',
): StoryViewerState | null {
  const groupIndex = groups.findIndex(
    (group) => group.character.id === viewer.characterId,
  );

  if (groupIndex < 0) {
    return null;
  }

  const group = groups[groupIndex];

  if (direction === 'next') {
    if (viewer.storyIndex < group.stories.length - 1) {
      return { ...viewer, storyIndex: viewer.storyIndex + 1 };
    }

    const nextGroup = groups[groupIndex + 1];
    return nextGroup
      ? { characterId: nextGroup.character.id, storyIndex: 0 }
      : null;
  }

  if (viewer.storyIndex > 0) {
    return { ...viewer, storyIndex: viewer.storyIndex - 1 };
  }

  const previousGroup = groups[groupIndex - 1];
  return previousGroup
    ? {
        characterId: previousGroup.character.id,
        storyIndex: previousGroup.stories.length - 1,
      }
    : viewer;
}

export function getAdjacentStory(
  groups: StoryGroup[],
  viewer: StoryViewerState,
  direction: 'next' | 'previous',
) {
  const nextViewer = moveStoryViewer(groups, viewer, direction);

  if (
    !nextViewer ||
    (nextViewer.characterId === viewer.characterId &&
      nextViewer.storyIndex === viewer.storyIndex)
  ) {
    return null;
  }

  return getCurrentStory(groups, nextViewer)?.story ?? null;
}
