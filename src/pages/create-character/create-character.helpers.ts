import { CharacterFetish } from '@/common/consts/character';
import type { CreateCharacterDto } from '@/common/types';

import type { Draft, MediaOption, TextOption } from "./create-character.types";

export function titleize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function toTranslationKey(value: string) {
  return value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function mapMediaOptions<T extends string>(
  values: readonly T[],
  media: Record<T, string>,
  labelMap?: Partial<Record<T, string>> | ((value: T) => string),
): Array<MediaOption<T>> {
  return values.map((value) => ({
    value,
    label:
      typeof labelMap === 'function'
        ? labelMap(value)
        : labelMap?.[value] ?? titleize(value),
    mediaUrl: media[value],
  }));
}

export function mapTextOptions<T extends string>(
  values: readonly T[],
  labelMap: Record<T, string> | ((value: T) => string),
  iconMap?: Record<T, string>,
): Array<TextOption<T>> {
  return values.map((value) => ({
    value,
    label: typeof labelMap === 'function' ? labelMap(value) : labelMap[value],
    icon: iconMap?.[value],
  }));
}

export function buildPayload(draft: Draft): CreateCharacterDto {
  const fetishes = draft.fetishes.filter((item) => item !== CharacterFetish.None);

  return {
    type: draft.type,
    ethnicity: draft.ethnicity,
    hairStyle: draft.hairStyle,
    hairColor: draft.hairColor,
    eyeColor: draft.eyeColor,
    bodyType: draft.bodyType,
    breastSize: draft.breastSize,
    buttSize: draft.buttSize,
    name: draft.name.trim(),
    age: draft.age,
    personality: draft.personality,
    hobbies: draft.hobbies,
    scenario: draft.scenario,
    fetishes,
  };
}
