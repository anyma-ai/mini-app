import type { CustomScenarioType } from '@/common/consts/character';
import type { CreateCharacterDto } from '@/common/types';

export type WizardStepId = "type" | "ethnicity" | "face" | "body" | "profile";

export type ModalKind = "personality" | "hobbies" | "scenario" | "fetishes" | null;

export type MediaOption<T extends string> = {
  value: T;
  label: string;
  mediaUrl: string;
};

export type TextOption<T extends string> = {
  value: T;
  label: string;
  icon?: string;
};

export type Draft = Omit<CreateCharacterDto, "scenario"> & {
  scenario: CustomScenarioType | "";
};

export type MediaGridColumns =
  | "wide"
  | "compact"
  | "two"
  | "ethnicity"
  | "six"
  | "face"
  | "body"
  | "breast"
  | "butt";
