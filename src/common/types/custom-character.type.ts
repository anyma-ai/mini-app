import type {
  ButtSize,
  CharacterBodyType,
  CharacterBreastSize,
  CharacterEthnicity,
  CharacterEyeColor,
  CharacterHairColor,
  CharacterHairStyle,
  CharacterPersonality,
  CharacterType,
  CustomScenarioType,
} from '@/common/consts/character';

export interface CreateCharacterDto {
  type: CharacterType;
  ethnicity: CharacterEthnicity;
  hairStyle: CharacterHairStyle;
  hairColor: CharacterHairColor;
  eyeColor: CharacterEyeColor;
  bodyType: CharacterBodyType;
  breastSize: CharacterBreastSize;
  buttSize: ButtSize;
  name: string;
  age: number;
  personality: CharacterPersonality[];
  hobbies: string[];
  fetishes: string[];
  scenario: string;
}

export interface CreateCharacterScenarioDto {
  description: CustomScenarioType;
}

export const CUSTOM_CHARACTER_PRICE = 50;
export const CUSTOM_SCENARIO_PRICE = 40;
