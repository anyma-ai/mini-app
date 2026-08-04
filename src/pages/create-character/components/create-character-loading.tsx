import { useEffect, useState } from 'react';

import logo from '@/assets/logo.jpg';
import {
  CHARACTER_FETISH_LABEL,
  CHARACTER_HOBBY_LABEL,
  CHARACTER_PERSONALITY_LABEL,
  CharacterFetish,
  CharacterHobby,
  CUSTOM_SCENARIO_LABEL,
} from '@/common/consts/character';

import { titleize } from '../create-character.helpers';
import styles from '../create-character.module.scss';
import type { Draft } from '../create-character.types';

const LOADING_MESSAGES = [
  'Saving appearance...',
  'Building personality...',
  'Preparing first roleplay...',
  'Almost ready...',
];

type OverviewItem = {
  label: string;
  value: string | null;
};

type OverviewSection = {
  title: string;
  items: OverviewItem[];
};

function formatList(values: string[], labels: Record<string, string>) {
  const filteredValues = values.filter(
    (value) => value !== CharacterHobby.None && value !== CharacterFetish.None,
  );

  if (!filteredValues.length) {
    return null;
  }

  return filteredValues
    .map((value) => labels[value] ?? titleize(value))
    .join(', ');
}

export function CreateCharacterLoading({ draft }: { draft: Draft }) {
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const activeMessage = LOADING_MESSAGES[activeMessageIndex];
  const overviewSections: OverviewSection[] = [
    {
      title: 'Profile',
      items: [
        { label: 'Age', value: String(draft.age) },
        { label: 'Style', value: titleize(draft.type) },
        { label: 'Origin', value: titleize(draft.ethnicity) },
      ],
    },
    {
      title: 'Look',
      items: [
        {
          label: 'Hair',
          value: `${titleize(draft.hairColor)} ${titleize(draft.hairStyle)}`,
        },
        { label: 'Eyes', value: titleize(draft.eyeColor) },
        { label: 'Body', value: titleize(draft.bodyType) },
        { label: 'Breast', value: titleize(draft.breastSize) },
        { label: 'Butt', value: titleize(draft.buttSize) },
      ],
    },
    {
      title: 'Vibe',
      items: [
        {
          label: 'Personality',
          value: formatList(draft.personality, CHARACTER_PERSONALITY_LABEL),
        },
        {
          label: 'Hobbies',
          value: formatList(draft.hobbies, CHARACTER_HOBBY_LABEL),
        },
        {
          label: 'First Roleplay',
          value: draft.scenario ? CUSTOM_SCENARIO_LABEL[draft.scenario] : null,
        },
        {
          label: 'Fetishes',
          value: formatList(draft.fetishes, CHARACTER_FETISH_LABEL),
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
      setActiveMessageIndex((index) => (index + 1) % LOADING_MESSAGES.length);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, []);

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
      <aside className={styles.loadingOverview} aria-label="Character overview">
        <div className={styles.loadingOverviewHeader}>
          <span>Overview</span>
          <strong>{draft.name.trim() || 'Her'}</strong>
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
