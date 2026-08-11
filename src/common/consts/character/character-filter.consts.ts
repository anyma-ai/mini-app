import { CharacterBodyType, CharacterBreastSize, CharacterEthnicity, CharacterFilterTag, CharacterGender, CharacterHairColor, CharacterType } from "./character-appearance.consts"


export interface CharacterFilter {
    search?: string;
    gender?: CharacterGender;
    type?: CharacterType;
    ethnicity?: CharacterEthnicity;
    hairColor?: CharacterHairColor;
    breastSize?: CharacterBreastSize;
    bodyType?: CharacterBodyType;
    ageFrom?: number;
    ageTo?: number;
}

export const CHARACTER_FILTER_TAG_LABELS: Record<CharacterFilterTag, string> = {
    [CharacterFilterTag.Caucasian]: 'Caucasian',
    [CharacterFilterTag.Latina]: 'Latina',
    [CharacterFilterTag.Asian]: 'Asian',
    [CharacterFilterTag.Young]: '18-21',
    [CharacterFilterTag.Milf]: 'Milf',
    [CharacterFilterTag.Blond]: 'Blonde',
    [CharacterFilterTag.Brunette]: 'Brunette',
    [CharacterFilterTag.Redhead]: 'Redhead',
    [CharacterFilterTag.Arab]: 'Arab',
    [CharacterFilterTag.Black]: 'Afro',
}

export const CHARACTER_FILTER_PARAMS: Record<CharacterFilterTag, object> = {
    [CharacterFilterTag.Caucasian]: { ethnicity: CharacterEthnicity.Caucasian },
    [CharacterFilterTag.Latina]: { ethnicity: CharacterEthnicity.Latina },
    [CharacterFilterTag.Asian]: { ethnicity: CharacterEthnicity.Asian },
    [CharacterFilterTag.Young]: { ageFrom: 18, ageTo: 21 },
    [CharacterFilterTag.Blond]: { hairColor: CharacterHairColor.Blond },
    [CharacterFilterTag.Brunette]: { hairColor: CharacterHairColor.Brunette },
    [CharacterFilterTag.Redhead]: { hairColor: CharacterHairColor.Redhead },
    [CharacterFilterTag.Milf]: { ageFrom: 30 },
    [CharacterFilterTag.Arab]: { ethnicity: CharacterEthnicity.Arabian },
    [CharacterFilterTag.Black]: { ethnicity: CharacterEthnicity.Afro },
}
