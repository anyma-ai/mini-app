export interface ICharacter {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  promoImgUrl?: string;
  emoji: string;
  isFeatured: boolean;
  scenarios: IScenario[];
}

export interface IScenario {
  id: string;
  slug?: string;
  name: string;
  description: string;
  shortDescription: string;
  isActive: boolean;
  promoImgUrl: string;
  promoImgHorizontalUrl: string;
  isNew: boolean;
  createdAt: string;
}

export enum StoryType {
  Photo = 'photo',
  Video = 'video',
}

export interface IStory {
  id: string;
  type: StoryType;
  fileUrl: string;
  idx: number;
  characterId: string;
}
