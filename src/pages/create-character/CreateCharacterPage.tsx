import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { createCustomCharacter } from '@/api/custom-character';
import {
  CHARACTER_FETISH_EMOJI,
  CHARACTER_HOBBY_EMOJI,
  CHARACTER_PERSONALITY_EMOJI,
  CharacterFetish,
  CharacterHobby,
  CUSTOM_SCENARIO_EMOJI,
} from '@/common/consts/character';
import { CUSTOM_CHARACTER_PRICE } from '@/common/types';
import { cn } from '@/common/utils';
import { useUser } from '@/context/UserContext';

import { AgeControl } from './components/age-control';
import { CreateCharacterLoading } from './components/create-character-loading';
import { MediaChoiceGroup } from './components/media-choice-group';
import { MultiSelectModal } from './components/multi-select-modal';
import { SelectionField } from './components/selection-field';
import { WizardProgress } from './components/wizard-progress';
import {
  getLocalizedCreateCharacterOptions,
  getWizardSteps,
  MAX_AGE,
  MIN_AGE,
} from './create-character.data';
import {
  buildPayload,
  titleize,
  toTranslationKey,
} from './create-character.helpers';
import styles from './create-character.module.scss';
import type { Draft, ModalKind } from './create-character.types';
import { ChevronRightIcon, SparklesIcon } from './icons';
import { Alert, Button, Field, Input, Typography } from './ui';
import { usePersistedCreateCharacterDraft } from './use-persisted-create-character-draft';

const CREATE_CHARACTER_RETURN_TO =
  '/create-character?paywall=create-character';

function buildCreateCharacterShopUrl() {
  const query = new URLSearchParams({
    returnTo: CREATE_CHARACTER_RETURN_TO,
  });

  return `/shop?${query.toString()}`;
}

export function CreateCharacterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const resumeCreate = searchParams.get('paywall') === 'create-character';
  const { user, refresh } = useUser();
  const createCharacter = useMutation({
    mutationFn: createCustomCharacter,
  });
  const [draft, setDraft, activeStepIndex, setActiveStepIndex, clearPersistedDraft] =
    usePersistedCreateCharacterDraft();
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const resumeCreateHandledRef = useRef(false);

  const wizardSteps = useMemo(() => getWizardSteps(t), [t]);
  const localizedOptions = useMemo(
    () => getLocalizedCreateCharacterOptions(t),
    [t],
  );
  const activeStep = wizardSteps[activeStepIndex];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === wizardSteps.length - 1;
  const nameIsValid = draft.name.trim().length > 0;
  const ageIsValid = draft.age >= MIN_AGE && draft.age <= MAX_AGE;
  const personalityIsValid = draft.personality.length >= 1;
  const scenarioIsValid = Boolean(draft.scenario);
  const createDraftIsValid =
    nameIsValid && ageIsValid && personalityIsValid && scenarioIsValid;
  const currentStepIsValid =
    activeStep.id !== 'profile' || createDraftIsValid;
  const nextIsDisabled = createCharacter.isPending || !currentStepIsValid;

  const patchDraft = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const submitCreateCharacter = useCallback(async () => {
    try {
      const character = await createCharacter.mutateAsync(buildPayload(draft));

      clearPersistedDraft();
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ['custom-characters'] });

      if (character.id) {
        navigate(`/companions/${character.id}?isCustom=1`, { replace: true });
        return;
      }

      navigate('/my-girls', { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('createCharacter.errors.failedCreate');
      setSubmitError(message);
    }
  }, [
    clearPersistedDraft,
    createCharacter,
    draft,
    navigate,
    queryClient,
    refresh,
    t,
  ]);

  const handleCreateDecision = useCallback(async () => {
    setSubmitError(null);

    if (!createDraftIsValid || createCharacter.isPending || !user) {
      return;
    }

    if ((user.air ?? 0) >= CUSTOM_CHARACTER_PRICE) {
      await submitCreateCharacter();
      return;
    }

    // Draft is already persisted — shop returnTo resumes this last step.
    navigate(buildCreateCharacterShopUrl());
  }, [
    createCharacter.isPending,
    createDraftIsValid,
    navigate,
    submitCreateCharacter,
    user,
  ]);

  useEffect(() => {
    if (
      !resumeCreate ||
      resumeCreateHandledRef.current ||
      !createDraftIsValid ||
      !user
    ) {
      return;
    }

    resumeCreateHandledRef.current = true;
    const timeoutId = window.setTimeout(() => {
      setActiveStepIndex(wizardSteps.length - 1);
      void handleCreateDecision();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    createDraftIsValid,
    handleCreateDecision,
    resumeCreate,
    setActiveStepIndex,
    user,
    wizardSteps.length,
  ]);

  const goNext = async () => {
    setSubmitError(null);

    if (activeStepIndex < wizardSteps.length - 1) {
      setActiveStepIndex((index) => index + 1);
      return;
    }

    await handleCreateDecision();
  };

  const openModal = (kind: ModalKind) => {
    setActiveModal(kind);
  };

  return (
    <div className={styles.page}>
      {createCharacter.isPending ? (
        <CreateCharacterLoading draft={draft} />
      ) : (
        <>
          <header className={styles.hero}>
            <Typography
              as="h1"
              variant="display-lg"
              align="center"
              className={cn(styles.heroTitle, [], {
                [styles.heroTitleMobileHidden]: !isFirstStep,
              })}
            >
              {t('createCharacter.title.main')}{' '}
              <span
                className={isFirstStep ? styles.heroTitleAccent : undefined}
              >
                {t('createCharacter.title.accent')}
              </span>
            </Typography>
            {!isFirstStep ? (
              <WizardProgress
                activeIndex={activeStepIndex}
                ariaLabel={t('createCharacter.aria.progress')}
                steps={wizardSteps}
                onStepClick={(index) => setActiveStepIndex(index)}
              />
            ) : null}
          </header>

          <div className={styles.workArea}>
            <div className={styles.layout}>
              <main className={styles.panel}>
                {activeStep.id === 'type' ? (
                  <MediaChoiceGroup
                    ariaLabel={t('createCharacter.aria.characterType')}
                    columns="two"
                    options={localizedOptions.typeOptions}
                    value={draft.type}
                    onChange={(type) => patchDraft({ type })}
                  />
                ) : null}

                {activeStep.id === 'ethnicity' ? (
                  <MediaChoiceGroup
                    ariaLabel={t('createCharacter.aria.characterEthnicity')}
                    columns="ethnicity"
                    options={localizedOptions.ethnicityOptions}
                    value={draft.ethnicity}
                    onChange={(ethnicity) => patchDraft({ ethnicity })}
                  />
                ) : null}

                {activeStep.id === 'face' ? (
                  <div className={styles.groupStack}>
                    <section className={styles.choiceSection}>
                      <Typography
                        as="h3"
                        variant="headline-md"
                        className={styles.choiceSectionTitle}
                      >
                        {t('createCharacter.fields.hairStyle')}
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel={t('createCharacter.fields.hairStyle')}
                        columns="face"
                        options={localizedOptions.hairStyleOptions}
                        value={draft.hairStyle}
                        onChange={(hairStyle) => patchDraft({ hairStyle })}
                      />
                    </section>
                    <section className={styles.choiceSection}>
                      <Typography
                        as="h3"
                        variant="headline-md"
                        className={styles.choiceSectionTitle}
                      >
                        {t('createCharacter.fields.hairColor')}
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel={t('createCharacter.fields.hairColor')}
                        columns="face"
                        options={localizedOptions.hairColorOptions}
                        value={draft.hairColor}
                        onChange={(hairColor) => patchDraft({ hairColor })}
                      />
                    </section>
                    <section className={styles.choiceSection}>
                      <Typography
                        as="h3"
                        variant="headline-md"
                        className={styles.choiceSectionTitle}
                      >
                        {t('createCharacter.fields.eyeColor')}
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel={t('createCharacter.fields.eyeColor')}
                        columns="face"
                        options={localizedOptions.eyeColorOptions}
                        value={draft.eyeColor}
                        onChange={(eyeColor) => patchDraft({ eyeColor })}
                      />
                    </section>
                  </div>
                ) : null}

                {activeStep.id === 'body' ? (
                  <div className={styles.groupStack}>
                    <section className={styles.choiceSection}>
                      <Typography
                        as="h3"
                        variant="headline-md"
                        className={styles.choiceSectionTitle}
                      >
                        {t('createCharacter.fields.bodyType')}
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel={t('createCharacter.fields.bodyType')}
                        columns="body"
                        options={localizedOptions.bodyTypeOptions}
                        value={draft.bodyType}
                        onChange={(bodyType) => patchDraft({ bodyType })}
                      />
                    </section>
                    <section className={styles.choiceSection}>
                      <Typography
                        as="h3"
                        variant="headline-md"
                        className={styles.choiceSectionTitle}
                      >
                        {t('createCharacter.fields.breastSize')}
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel={t('createCharacter.fields.breastSize')}
                        columns="breast"
                        options={localizedOptions.breastSizeOptions}
                        value={draft.breastSize}
                        onChange={(breastSize) => patchDraft({ breastSize })}
                      />
                    </section>
                    <section className={styles.choiceSection}>
                      <Typography
                        as="h3"
                        variant="headline-md"
                        className={styles.choiceSectionTitle}
                      >
                        {t('createCharacter.fields.buttSize')}
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel={t('createCharacter.fields.buttSize')}
                        columns="butt"
                        options={localizedOptions.buttSizeOptions}
                        value={draft.buttSize}
                        onChange={(buttSize) => patchDraft({ buttSize })}
                      />
                    </section>
                  </div>
                ) : null}

                {activeStep.id === 'profile' ? (
                  <div className={styles.formGrid}>
                    <Field
                      className={styles.nameField}
                      label={
                        <Typography
                          as="span"
                          variant="meta"
                          className={styles.profileLabel}
                        >
                          {t('createCharacter.fields.name')}
                        </Typography>
                      }
                    >
                      <Input
                        aria-label={t('createCharacter.aria.characterName')}
                        fullWidth
                        wrapperClassName={styles.nameInputWrapper}
                        className={styles.nameInput}
                        placeholder={t('createCharacter.placeholders.name')}
                        value={draft.name}
                        onChange={(event) =>
                          patchDraft({ name: event.target.value })
                        }
                      />
                    </Field>

                    <Field
                      className={styles.ageField}
                      label={
                        <Typography
                          as="span"
                          variant="meta"
                          className={styles.profileLabel}
                        >
                          {t('createCharacter.fields.age')}
                        </Typography>
                      }
                    >
                      <AgeControl
                        value={draft.age}
                        onChange={(age) => patchDraft({ age })}
                      />
                    </Field>

                    <div className={styles.selectionGrid}>
                      <SelectionField
                        emptyText={t(
                          'createCharacter.placeholders.choosePersonality',
                        )}
                        emojis={draft.personality.map(
                          (item) => CHARACTER_PERSONALITY_EMOJI[item],
                        )}
                        label={t('createCharacter.fields.personality')}
                        values={draft.personality.map(
                          (item) => t(`character.personality.${item}`),
                        )}
                        onOpen={() => openModal('personality')}
                      />
                      <SelectionField
                        emptyText={t(
                          'createCharacter.placeholders.chooseHobbies',
                        )}
                        emojis={draft.hobbies
                          .filter(
                            (item): item is CharacterHobby =>
                              item !== CharacterHobby.None,
                          )
                          .map((item) => CHARACTER_HOBBY_EMOJI[item])}
                        label={t('createCharacter.fields.hobbies')}
                        values={draft.hobbies.map(
                          (item) =>
                            t(`character.hobby.${item}`, {
                              defaultValue: titleize(item),
                            }),
                        )}
                        onOpen={() => openModal('hobbies')}
                      />

                      <SelectionField
                        emptyText={t(
                          'createCharacter.placeholders.chooseRoleplay',
                        )}
                        emojis={
                          draft.scenario
                            ? [CUSTOM_SCENARIO_EMOJI[draft.scenario]]
                            : []
                        }
                        label={t('createCharacter.fields.firstRoleplay')}
                        values={
                          draft.scenario
                            ? [
                                t(
                                  `character.scenario.${toTranslationKey(
                                    draft.scenario,
                                  )}`,
                                ),
                              ]
                            : []
                        }
                        onOpen={() => openModal('scenario')}
                      />

                      <SelectionField
                        emptyText={t(
                          'createCharacter.placeholders.chooseFetishes',
                        )}
                        emojis={draft.fetishes
                          .filter(
                            (item): item is CharacterFetish =>
                              item !== CharacterFetish.None,
                          )
                          .map((item) => CHARACTER_FETISH_EMOJI[item])}
                        label={t('createCharacter.fields.fetishes')}
                        values={draft.fetishes.map(
                          (item) =>
                            t(`character.fetish.${item}`, {
                              defaultValue: titleize(item),
                            }),
                        )}
                        onOpen={() => openModal('fetishes')}
                      />
                    </div>
                  </div>
                ) : null}

                {submitError ? (
                  <Alert
                    description={submitError}
                    title={t('createCharacter.errors.unableCreate')}
                    tone="danger"
                  />
                ) : null}
              </main>
            </div>

            <div className={styles.actions}>
              <Button
                className={
                  isFirstStep || isLastStep
                    ? styles.purchaseButton
                    : undefined
                }
                disabled={nextIsDisabled}
                iconLeft={
                  isFirstStep ? (
                    <SparklesIcon aria-hidden="true" />
                  ) : undefined
                }
                iconRight={
                  isFirstStep || isLastStep ? undefined : (
                    <ChevronRightIcon aria-hidden="true" />
                  )
                }
                shape="pill"
                type="button"
                size="lg"
                onClick={() => {
                  void goNext();
                }}
              >
                {isFirstStep ? (
                  t('createCharacter.actions.begin')
                ) : isLastStep ? (
                  <>
                    {t('createCharacter.actions.createHer')}{' '}
                    <span className={styles.ctaPrice}>
                      <SparklesIcon aria-hidden="true" />
                      <span>{CUSTOM_CHARACTER_PRICE}</span>
                    </span>
                  </>
                ) : (
                  t('createCharacter.actions.next')
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      <MultiSelectModal
        limit={2}
        min={1}
        open={activeModal === 'personality'}
        options={localizedOptions.personalityOptions}
        title={t('createCharacter.modals.selectPersonality')}
        value={draft.personality}
        onChange={(personality) => patchDraft({ personality })}
        onClose={() => setActiveModal(null)}
      />
      <MultiSelectModal
        clearValue={CharacterHobby.None}
        limit={3}
        open={activeModal === 'hobbies'}
        options={localizedOptions.hobbyOptions}
        title={t('createCharacter.modals.selectHobbies')}
        value={draft.hobbies as CharacterHobby[]}
        onChange={(hobbies) => patchDraft({ hobbies })}
        onClose={() => setActiveModal(null)}
      />
      <MultiSelectModal
        limit={1}
        min={1}
        open={activeModal === 'scenario'}
        options={localizedOptions.scenarioOptions}
        title={t('createCharacter.modals.firstRoleplay')}
        value={draft.scenario ? [draft.scenario] : []}
        onChange={(scenario) => patchDraft({ scenario: scenario[0] ?? '' })}
        onClose={() => setActiveModal(null)}
      />
      <MultiSelectModal
        clearValue={CharacterFetish.None}
        limit={3}
        open={activeModal === 'fetishes'}
        options={localizedOptions.fetishOptions}
        title={t('createCharacter.modals.fetishes')}
        value={draft.fetishes as CharacterFetish[]}
        onChange={(fetishes) => patchDraft({ fetishes })}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
