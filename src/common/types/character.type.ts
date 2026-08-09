export interface ICharacter {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  promoImgUrl?: string;
  emoji: string;
  isFeatured: boolean;
  scenarios: IScenario[];
  type: CharacterType;
  personality: CharacterPersonality[];
}

export enum CharacterType {
  Realistic = 'realistic',
  Anime = 'anime',
}

export enum CharacterPersonality {
  Hot = 'hot',
  Playful = 'playful',
  Devoted = 'devoted',
}

export enum RoleplayStage {
  Acquaintance = 'ACQUAINTANCE',
  Flirting = 'FLIRTING',
  Seduction = 'SEDUCTION',

  Resistance = 'RESISTANCE',

  Undressing = 'UNDRESSING',
  Prelude = 'PRELUDE',
  Sex = 'SEX',
  Aftercare = 'AFTERCARE',
}
export interface IScenarioProgress {
  id: string;
  opensAt: string;
  maxStage: RoleplayStage;
}

export interface IScenario {
  id: string;
  slug?: string;
  level: number;
  name: string;
  description: string;
  shortDescription: string;
  isActive: boolean;
  promoImgUrl: string;
  promoImgHorizontalUrl: string;
  openingImageUrl?: string;
  isNew: boolean;
  createdAt: string;
  opensAfterId?: string;
  scenarioProgress?: IScenarioProgress;
}

export enum ContentItemType {
  Image = 'image',
  Video = 'video',
}

export enum Explicitness {
  Sexy = 'sexy',
  Nudes = 'nudes',
  Explicit = 'explicit',
}

export type ScenarioDetails = IScenario & {
  isUnlocked: boolean;
  promoVideoUrl?: string | null;
  character: Pick<
    ICharacter,
    'id' | 'name' | 'avatarUrl' | 'description' | 'personality' | 'type'
  > & {
    age?: number;
  };
};

export type ScenarioMedia = {
  id: string;
  url: string;
  previewUrl: string | null;
  type: ContentItemType;
  stage?: RoleplayStage | number | null;
  explicitness?: Explicitness;
  isBlurred: boolean;
  createdAt: string;
};

export type ScenarioMediaTotals = {
  images: number;
  videos: number;
};

export type ScenarioListItem = {
  id: string;
  slug: string;
  name: string;
  character: Pick<
    ICharacter,
    'id' | 'name' | 'avatarUrl' | 'personality'
  > & {
    age: number;
    promoImgUrl?: string | null;
  };
  promoImgUrl: string;
  promoVideoUrl: string | null;
  openingImageUrl: string;
  shortDescription: string;
  description: string;
  createdAt: string;
};

export type ScenarioPromo = {
  characterScenarios: ScenarioListItem[];
  promoItems: ScenarioMedia[];
  blurredPromoItems: ScenarioMedia[];
};

export type Paginated<T> = {
  data: T[];
  total: number;
  skip: number;
  take: number;
};

export type UnlockScenarioResponse = {
  scenario?: ScenarioDetails;
  user?: import('./user.type').IUser;
};

export type UnblurScenarioVideoResponse =
  | ScenarioMedia
  | { item?: ScenarioMedia; video?: ScenarioMedia; user?: import('./user.type').IUser }
  | { data: ScenarioMedia }
  | {
      data: {
        item?: ScenarioMedia;
        video?: ScenarioMedia;
        user?: import('./user.type').IUser;
      };
    };

export enum StoryType {
  Photo = 'photo',
  Video = 'video',
}

export type StoryCharacter = Pick<ICharacter, 'id' | 'name' | 'avatarUrl'> & {
  age?: number;
  promoImgUrl?: string | null;
};

export interface IStory {
  id: string;
  type: StoryType;
  fileUrl: string;
  idx: number;
  characterId: string;
  character?: StoryCharacter;
}
