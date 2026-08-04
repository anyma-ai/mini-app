import { ButtSize, CharacterBodyType, CharacterBreastSize, CharacterEthnicity, CharacterEyeColor, CharacterHairColor, CharacterHairStyle, CharacterType } from "./character-appearance.consts";

// videos
export const CHARACTER_TYPE_MEDIA = {
    // [CharacterType.Realistic]: 'https://d3t73m5p5h292a.cloudfront.net/d469f983-331b-49bc-b888-fa8761a118c1.mp4',
    // [CharacterType.Anime]: 'https://d3t73m5p5h292a.cloudfront.net/8945c680-1fe7-485f-8275-246b14713d02.mp4',
    [CharacterType.Realistic]: 'https://d1htf7aiyeokrn.cloudfront.net/2509c07c-e85d-4679-b941-7294db56e06e.png',
    [CharacterType.Anime]: 'https://d1htf7aiyeokrn.cloudfront.net/9483f81c-aeb9-4a91-82cc-72e4c5020135.png',
}

// videos
export const CHARACTER_ETHNICITY_MEDIA = {
    [CharacterEthnicity.Asian]: 'https://static.ourdream.ai/create-videos/w240/275c7ff4-2c24-4a03-9d11-ddbe306b07a1.mp4',
    [CharacterEthnicity.Afro]: 'https://static.ourdream.ai/create-videos/w240/8a6cc688-afe9-4960-8532-1b8fab24d6ab.mp4',
    [CharacterEthnicity.Caucasian]: 'https://static.ourdream.ai/create-videos/w240/26760bad-cd06-42df-92fd-ff5e6dc6960a.mp4',
    [CharacterEthnicity.Latina]: 'https://static.ourdream.ai/create-videos/w240/634d1042-6452-486b-b155-2ebe84b4a2ed.mp4',
    [CharacterEthnicity.Arabian]: 'https://static.ourdream.ai/create-videos/w240/aee572c4-6584-4142-9534-c2e89b556f06.mp4',
    [CharacterEthnicity.Indian]: 'https://static.ourdream.ai/create-videos/w240/9ec36190-47fc-4b0d-a788-eca87814afc8.mp4',
}

// videos
export const CHARACTER_HAIR_STYLE_MEDIA = {
    [CharacterHairStyle.Straight]: 'https://static.ourdream.ai/create-videos/w240/270065a3-61c3-4e37-8f52-4dfed7b0ad29.mp4',
    [CharacterHairStyle.Bangs]: 'https://static.ourdream.ai/create-videos/w240/da075e1e-8ca9-45c3-a97c-2b2091822ba3.mp4',
    [CharacterHairStyle.Ponytail]: 'https://static.ourdream.ai/create-videos/w240/42ddc4ab-f585-4bc2-8acb-0c8e72794100.mp4',
    [CharacterHairStyle.Curly]: 'https://static.ourdream.ai/create-videos/w240/9484bfb5-b9e0-4ff3-b347-373394e0fb68.mp4',
    [CharacterHairStyle.Bun]: 'https://static.ourdream.ai/create-videos/w240/899eab01-3939-4c9c-8960-0a223e1fca78.mp4',
    [CharacterHairStyle.Short]: 'https://static.ourdream.ai/create-videos/w240/cecff776-726e-4a1a-a535-c39d2cab0139.mp4',
}

// images
export const CHARACTER_HAIR_COLOR_MEDIA = {
    [CharacterHairColor.Blond]: 'https://cdn.candy.ai/79a2169c-943e-41e2-9f34-7e5b84a315e6',
    [CharacterHairColor.Brunette]: 'https://cdn.candy.ai/d4fb233a-05d7-4d54-8f04-d005f4ec8e3e',
    [CharacterHairColor.Redhead]: 'https://cdn.candy.ai/6fbdf45f-b6b0-47a5-a5fc-23f4fb5627e1',
    [CharacterHairColor.Black]: 'https://cdn.candy.ai/d4fb233a-05d7-4d54-8f04-d005f4ec8e3e',
    [CharacterHairColor.Pink]: 'https://cdn.candy.ai/64cd1d44-6d94-444b-a5eb-02120e5ec74b',
}

// images
export const CHARACTER_EYE_COLOR_MEDIA = {
    [CharacterEyeColor.Brown]: 'https://cdn.candy.ai/973f84f5-5896-48e3-8e09-68f9a7f8ef16',
    [CharacterEyeColor.Blue]: 'https://cdn.candy.ai/effbe387-0cc9-4875-a71c-41839aee7ea2',
    [CharacterEyeColor.Green]: 'https://cdn.candy.ai/e943793b-fda6-46bd-a122-fa53f348764c',
}

export const CHARACTER_BODY_TYPE_MEDIA: Record<CharacterBodyType, string> = {
    [CharacterBodyType.Skinny]: 'https://static.ourdream.ai/create-videos/w240/abd2eb57-4508-4762-bd40-e95b592daf7c.mp4',
    [CharacterBodyType.Athletic]: 'https://static.ourdream.ai/create-videos/w240/7ad62e25-0839-4c65-81df-ed07ee918fa3.mp4',
    [CharacterBodyType.Average]: 'https://static.ourdream.ai/create-videos/w240/6818e669-e2bd-47cf-854b-63d40307459b.mp4',
    [CharacterBodyType.Curvy]: 'https://static.ourdream.ai/create-videos/w240/6818e669-e2bd-47cf-854b-63d40307459b.mp4',
    [CharacterBodyType.Bbw]: 'https://static.ourdream.ai/create-videos/w240/2517d2c2-fa66-48ea-8a93-4282499cfc36.mp4',
}

export const CHARACTER_BREAST_SIZE_MEDIA = {
    [CharacterBreastSize.Small]: 'https://static.ourdream.ai/create-videos/w240/13bbd227-4ca8-4a5c-b85f-42b68a9fa438.mp4',
    [CharacterBreastSize.Medium]: 'https://static.ourdream.ai/create-videos/w240/bae310aa-41ec-4cb8-b0ec-6b10a7179a31.mp4',
    [CharacterBreastSize.Large]: 'https://static.ourdream.ai/create-videos/w240/a69f44a0-bca7-4b72-9171-3b5f62d95dc8.mp4',
    [CharacterBreastSize.ExtraLarge]: 'https://static.ourdream.ai/create-videos/w240/4ce2f2ea-2822-41ab-ae91-0d8de73d0e96.mp4',
}

export const CHARACTER_BUTT_SIZE_MEDIA = {
    [ButtSize.Small]: 'https://static.ourdream.ai/create-videos/w240/ebb66510-d21e-4e34-a60a-ec1b1c9a8ffe.mp4',
    [ButtSize.Medium]: 'https://static.ourdream.ai/create-videos/w240/f4269124-2b9c-4e48-8c0c-02dd70010f02.mp4',
    [ButtSize.Large]: 'https://static.ourdream.ai/create-videos/w240/83bdbdf2-0a79-41e1-9251-d5d00109b06d.mp4',
}