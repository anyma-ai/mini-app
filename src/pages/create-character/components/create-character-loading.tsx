import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '@/assets/logo.jpg';
import {
  CharacterFetish,
  CharacterHobby,
} from '@/common/consts/character';

import { titleize, toTranslationKey } from '../create-character.helpers';
import styles from '../create-character.module.scss';
import type { Draft } from '../create-character.types';

type OverviewItem = {
  label: string;
  value: string | null;
};

type OverviewSection = {
  title: string;
  items: OverviewItem[];
};

function formatList(
  values: string[],
  translateLabel: (value: string) => string,
) {
  const filteredValues = values.filter(
    (value) => value !== CharacterHobby.None && value !== CharacterFetish.None,
  );

  if (!filteredValues.length) {
    return null;
  }

  return filteredValues
    .map((value) => translateLabel(value))
    .join(', ');
}

export function CreateCharacterLoading({ draft }: { draft: Draft }) {
  const { t } = useTranslation();
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const loadingMessages = [
    t('createCharacter.loading.savingAppearance'),
    t('createCharacter.loading.buildingPersonality'),
    t('createCharacter.loading.preparingRoleplay'),
    t('createCharacter.loading.almostReady'),
  ];
  const activeMessage = loadingMessages[activeMessageIndex];
  const label = (key: string, value: string) =>
    t(`${key}.${toTranslationKey(value)}`, { defaultValue: titleize(value) });
  const overviewSections: OverviewSection[] = [
    {
      title: t('createCharacter.loading.profile'),
      items: [
        { label: t('createCharacter.fields.age'), value: String(draft.age) },
        {
          label: t('createCharacter.steps.type'),
          value: label('character.type', draft.type),
        },
        {
          label: t('createCharacter.steps.ethnicity'),
          value: label('character.ethnicity', draft.ethnicity),
        },
      ],
    },
    {
      title: t('createCharacter.loading.look'),
      items: [
        {
          label: t('createCharacter.fields.hairStyle'),
          value: `${label('character.hairColor', draft.hairColor)} ${label(
            'character.hairStyle',
            draft.hairStyle,
          )}`,
        },
        {
          label: t('createCharacter.fields.eyeColor'),
          value: label('character.eyeColor', draft.eyeColor),
        },
        {
          label: t('createCharacter.fields.bodyType'),
          value: label('character.bodyType', draft.bodyType),
        },
        {
          label: t('createCharacter.fields.breastSize'),
          value: label('character.breastSize', draft.breastSize),
        },
        {
          label: t('createCharacter.fields.buttSize'),
          value: label('character.buttSize', draft.buttSize),
        },
      ],
    },
    {
      title: t('createCharacter.loading.vibe'),
      items: [
        {
          label: t('createCharacter.fields.personality'),
          value: formatList(draft.personality, (value) =>
            label('character.personality', value),
          ),
        },
        {
          label: t('createCharacter.fields.hobbies'),
          value: formatList(draft.hobbies, (value) =>
            label('character.hobby', value),
          ),
        },
        {
          label: t('createCharacter.fields.firstRoleplay'),
          value: draft.scenario ? label('character.scenario', draft.scenario) : null,
        },
        {
          label: t('createCharacter.fields.fetishes'),
          value: formatList(draft.fetishes, (value) =>
            label('character.fetish', value),
          ),
        },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item): item is { label: string; value: string } => Boolean(item.value),
      ),
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveMessageIndex((index) => (index + 1) % loadingMessages.length);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [loadingMessages.length]);

  return (
    <div className={styles.loadingScreen} role="status" aria-live="polite">
      <div className={styles.loadingCenter}>
        <div className={styles.loadingLogo} aria-hidden="true">
          <img src={logo} alt="" width={48} height={48} />
        </div>
        <span className={styles.loadingMessage} key={activeMessage}>
          {activeMessage}
        </span>
      </div>
      <aside
        className={styles.loadingOverview}
        aria-label={t('createCharacter.aria.overview')}
      >
        <div className={styles.loadingOverviewHeader}>
          <span>{t('createCharacter.loading.overview')}</span>
          <strong>
            {draft.name.trim() || t('createCharacter.loading.fallbackName')}
          </strong>
        </div>
        <div className={styles.loadingOverviewSections}>
          {overviewSections.map((section) => (
            <section
              className={styles.loadingOverviewSection}
              key={section.title}
            >
              <h2>{section.title}</h2>
              <dl>
                {section.items.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
