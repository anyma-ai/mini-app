import {
  ButtSize,
  CHARACTER_BODY_TYPE_MEDIA,
  CHARACTER_BREAST_SIZE_MEDIA,
  CHARACTER_BUTT_SIZE_MEDIA,
  CHARACTER_ETHNICITY_MEDIA,
  CHARACTER_EYE_COLOR_MEDIA,
  CHARACTER_FETISH_EMOJI,
  CHARACTER_FETISH_LABEL,
  CHARACTER_HAIR_COLOR_MEDIA,
  CHARACTER_HAIR_STYLE_MEDIA,
  CHARACTER_HOBBY_EMOJI,
  CHARACTER_HOBBY_LABEL,
  CHARACTER_PERSONALITY_EMOJI,
  CHARACTER_PERSONALITY_LABEL,
  CHARACTER_TYPE_MEDIA,
  CharacterBodyType,
  CharacterBreastSize,
  CharacterEthnicity,
  CharacterEyeColor,
  CharacterFetish,
  CharacterHairColor,
  CharacterHairStyle,
  CharacterHobby,
  CharacterPersonality,
  CharacterType,
  CUSTOM_SCENARIO_EMOJI,
  CUSTOM_SCENARIO_LABEL,
  CustomScenarioType,
} from '@/common/consts/character';

import { mapMediaOptions, mapTextOptions } from './create-character.helpers';
import type { Draft, WizardStepId } from './create-character.types';
import {
  BookHeartIcon,
  IdCardIcon,
  PersonStandingIcon,
  SmileIcon,
  VenusIcon,
} from './icons';

export const MIN_AGE = 18;
export const MAX_AGE = 55;

export const WIZARD_STEPS: Array<{
  id: WizardStepId;
  title: string;
  icon: typeof VenusIcon;
}> = [
  { id: 'type', title: 'Style', icon: VenusIcon },
  { id: 'ethnicity', title: 'Origin', icon: IdCardIcon },
  { id: 'face', title: 'Face', icon: SmileIcon },
  { id: 'body', title: 'Body', icon: PersonStandingIcon },
  { id: 'profile', title: 'Profile', icon: BookHeartIcon },
];

export const DEFAULT_DRAFT: Draft = {
  type: CharacterType.Realistic,
  ethnicity: CharacterEthnicity.Caucasian,
  hairStyle: CharacterHairStyle.Straight,
  hairColor: CharacterHairColor.Blond,
  eyeColor: CharacterEyeColor.Blue,
  bodyType: CharacterBodyType.Average,
  breastSize: CharacterBreastSize.Medium,
  buttSize: ButtSize.Medium,
  name: '',
  age: 23,
  personality: [CharacterPersonality.Sweet],
  hobbies: [CharacterHobby.Dancing],
  scenario: '',
  fetishes: [],
};

const BODY_ORDER = [
  CharacterBodyType.Skinny,
  CharacterBodyType.Athletic,
  CharacterBodyType.Average,
  CharacterBodyType.Curvy,
  CharacterBodyType.Bbw,
];

const BREAST_ORDER = [
  CharacterBreastSize.Small,
  CharacterBreastSize.Medium,
  CharacterBreastSize.Large,
  CharacterBreastSize.ExtraLarge,
];

export const typeOptions = mapMediaOptions(
  Object.values(CharacterType),
  CHARACTER_TYPE_MEDIA,
);
export const ethnicityOptions = mapMediaOptions(
  Object.values(CharacterEthnicity),
  CHARACTER_ETHNICITY_MEDIA,
);
export const hairStyleOptions = mapMediaOptions(
  Object.values(CharacterHairStyle),
  CHARACTER_HAIR_STYLE_MEDIA,
);
export const hairColorOptions = mapMediaOptions(
  Object.values(CharacterHairColor),
  CHARACTER_HAIR_COLOR_MEDIA,
);
export const eyeColorOptions = mapMediaOptions(
  Object.values(CharacterEyeColor),
  CHARACTER_EYE_COLOR_MEDIA,
);
export const bodyTypeOptions = mapMediaOptions(
  BODY_ORDER,
  CHARACTER_BODY_TYPE_MEDIA,
);
export const breastSizeOptions = mapMediaOptions(
  BREAST_ORDER,
  CHARACTER_BREAST_SIZE_MEDIA,
);
export const buttSizeOptions = mapMediaOptions(
  Object.values(ButtSize),
  CHARACTER_BUTT_SIZE_MEDIA,
);
export const personalityOptions = mapTextOptions(
  Object.values(CharacterPersonality),
  CHARACTER_PERSONALITY_LABEL,
  CHARACTER_PERSONALITY_EMOJI,
);
export const hobbyOptions = mapTextOptions(
  Object.values(CharacterHobby),
  CHARACTER_HOBBY_LABEL,
  CHARACTER_HOBBY_EMOJI,
);
export const fetishOptions = mapTextOptions(
  Object.values(CharacterFetish),
  CHARACTER_FETISH_LABEL,
  CHARACTER_FETISH_EMOJI,
);
export const scenarioOptions = mapTextOptions(
  Object.values(CustomScenarioType),
  CUSTOM_SCENARIO_LABEL,
  CUSTOM_SCENARIO_EMOJI,
);
