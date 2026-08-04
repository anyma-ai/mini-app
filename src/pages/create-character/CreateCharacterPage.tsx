import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  createCustomCharacter,
  getCustomCharacters,
} from '@/api/custom-character';
import {
  CHARACTER_FETISH_EMOJI,
  CHARACTER_FETISH_LABEL,
  CHARACTER_HOBBY_EMOJI,
  CHARACTER_HOBBY_LABEL,
  CHARACTER_PERSONALITY_EMOJI,
  CHARACTER_PERSONALITY_LABEL,
  CUSTOM_SCENARIO_EMOJI,
  CUSTOM_SCENARIO_LABEL,
  CharacterFetish,
  CharacterHobby,
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
  MAX_AGE,
  MIN_AGE,
  WIZARD_STEPS,
  bodyTypeOptions,
  breastSizeOptions,
  buttSizeOptions,
  ethnicityOptions,
  eyeColorOptions,
  fetishOptions,
  hairColorOptions,
  hairStyleOptions,
  hobbyOptions,
  personalityOptions,
  scenarioOptions,
  typeOptions,
} from './create-character.data';
import { buildPayload, titleize } from './create-character.helpers';
import styles from './create-character.module.scss';
import type { Draft, ModalKind } from './create-character.types';
import { ChevronRightIcon, SparklesIcon } from './icons';
import { Alert, Button, Field, Input, Typography } from './ui';
import { usePersistedCreateCharacterDraft } from './use-persisted-create-character-draft';

function buildCreateCharacterUpgradeUrl() {
  const query = new URLSearchParams({
    paywall: 'create-character',
    returnTo: '/create-character?paywall=create-character',
  });

  return `/subscriptions?${query.toString()}`;
}

export function CreateCharacterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const resumeCreate = searchParams.get('paywall') === 'create-character';
  const { user, refresh } = useUser();
  const { data: customCharacters = [], isFetched: customCharactersFetched } =
    useQuery({
      queryKey: ['custom-characters'],
      queryFn: getCustomCharacters,
    });
  const isFirstCustomCharacter = customCharactersFetched
    ? customCharacters.length === 0
    : true;
  const createPrice = isFirstCustomCharacter ? 0 : CUSTOM_CHARACTER_PRICE;
  const createCharacter = useMutation({
    mutationFn: createCustomCharacter,
  });
  const [draft, setDraft, activeStepIndex, setActiveStepIndex, clearPersistedDraft] =
    usePersistedCreateCharacterDraft();
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const resumeCreateHandledRef = useRef(false);

  const activeStep = WIZARD_STEPS[activeStepIndex];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === WIZARD_STEPS.length - 1;
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
        error instanceof Error ? error.message : 'Failed to create character.';
      setSubmitError(message);
    }
  }, [clearPersistedDraft, createCharacter, draft, navigate, queryClient, refresh]);

  const handleCreateDecision = useCallback(async () => {
    setSubmitError(null);

    if (!createDraftIsValid || createCharacter.isPending || !user) {
      return;
    }

    if (createPrice === 0 || (user.air ?? 0) >= createPrice) {
      await submitCreateCharacter();
      return;
    }

    if (!user.isSubscribed) {
      navigate(buildCreateCharacterUpgradeUrl());
      return;
    }

    navigate('/shop');
  }, [
    createCharacter.isPending,
    createDraftIsValid,
    createPrice,
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
      setActiveStepIndex(WIZARD_STEPS.length - 1);
      void handleCreateDecision();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    createDraftIsValid,
    handleCreateDecision,
    resumeCreate,
    setActiveStepIndex,
    user,
  ]);

  const goNext = async () => {
    setSubmitError(null);

    if (activeStepIndex < WIZARD_STEPS.length - 1) {
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
              Create Your{' '}
              <span
                className={isFirstStep ? styles.heroTitleAccent : undefined}
              >
                Perfect Girl
              </span>
            </Typography>
            {!isFirstStep ? (
              <WizardProgress
                activeIndex={activeStepIndex}
                onStepClick={(index) => setActiveStepIndex(index)}
              />
            ) : null}
          </header>

          <div className={styles.workArea}>
            <div className={styles.layout}>
              <main className={styles.panel}>
                {activeStep.id === 'type' ? (
                  <MediaChoiceGroup
                    ariaLabel="Character type"
                    columns="two"
                    options={typeOptions}
                    value={draft.type}
                    onChange={(type) => patchDraft({ type })}
                  />
                ) : null}

                {activeStep.id === 'ethnicity' ? (
                  <MediaChoiceGroup
                    ariaLabel="Character ethnicity"
                    columns="ethnicity"
                    options={ethnicityOptions}
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
                        Hair Style
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel="Hair style"
                        columns="face"
                        options={hairStyleOptions}
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
                        Hair Color
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel="Hair color"
                        columns="face"
                        options={hairColorOptions}
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
                        Eye Color
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel="Eye color"
                        columns="face"
                        options={eyeColorOptions}
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
                        Body Type
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel="Body type"
                        columns="body"
                        options={bodyTypeOptions}
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
                        Breast Size
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel="Breast size"
                        columns="breast"
                        options={breastSizeOptions}
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
                        Butt Size
                      </Typography>
                      <MediaChoiceGroup
                        ariaLabel="Butt size"
                        columns="butt"
                        options={buttSizeOptions}
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
                          Name
                        </Typography>
                      }
                    >
                      <Input
                        aria-label="Character Name"
                        fullWidth
                        wrapperClassName={styles.nameInputWrapper}
                        className={styles.nameInput}
                        placeholder="Jessica"
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
                          Age
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
                        emptyText="Choose 1-2 traits"
                        emojis={draft.personality.map(
                          (item) => CHARACTER_PERSONALITY_EMOJI[item],
                        )}
                        label="Personality"
                        values={draft.personality.map(
                          (item) => CHARACTER_PERSONALITY_LABEL[item],
                        )}
                        onOpen={() => openModal('personality')}
                      />
                      <SelectionField
                        emptyText="Choose Her hobbies"
                        emojis={draft.hobbies
                          .filter(
                            (item): item is CharacterHobby =>
                              item !== CharacterHobby.None,
                          )
                          .map((item) => CHARACTER_HOBBY_EMOJI[item])}
                        label="Hobbies"
                        values={draft.hobbies.map(
                          (item) =>
                            CHARACTER_HOBBY_LABEL[item as CharacterHobby] ??
                            titleize(item),
                        )}
                        onOpen={() => openModal('hobbies')}
                      />

                      <SelectionField
                        emptyText="Choose first roleplay"
                        emojis={
                          draft.scenario
                            ? [CUSTOM_SCENARIO_EMOJI[draft.scenario]]
                            : []
                        }
                        label="First Roleplay"
                        values={
                          draft.scenario
                            ? [CUSTOM_SCENARIO_LABEL[draft.scenario]]
                            : []
                        }
                        onOpen={() => openModal('scenario')}
                      />

                      <SelectionField
                        emptyText="Choose fetishes"
                        emojis={draft.fetishes
                          .filter(
                            (item): item is CharacterFetish =>
                              item !== CharacterFetish.None,
                          )
                          .map((item) => CHARACTER_FETISH_EMOJI[item])}
                        label="Fetishes"
                        values={draft.fetishes.map(
                          (item) =>
                            CHARACTER_FETISH_LABEL[item as CharacterFetish] ??
                            titleize(item),
                        )}
                        onOpen={() => openModal('fetishes')}
                      />
                    </div>
                  </div>
                ) : null}

                {submitError ? (
                  <Alert
                    description={submitError}
                    title="Unable to create character"
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
                  'Begin'
                ) : isLastStep ? (
                  createPrice > 0 ? (
                    <>
                      Create Her{' '}
                      <span className={styles.ctaPrice}>
                        <SparklesIcon aria-hidden="true" />
                        <span>{createPrice}</span>
                      </span>
                    </>
                  ) : (
                    'Create Her'
                  )
                ) : (
                  'Next'
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
        options={personalityOptions}
        title="Select Personality"
        value={draft.personality}
        onChange={(personality) => patchDraft({ personality })}
        onClose={() => setActiveModal(null)}
      />
      <MultiSelectModal
        clearValue={CharacterHobby.None}
        limit={3}
        open={activeModal === 'hobbies'}
        options={hobbyOptions}
        title="Select Hobbies"
        value={draft.hobbies as CharacterHobby[]}
        onChange={(hobbies) => patchDraft({ hobbies })}
        onClose={() => setActiveModal(null)}
      />
      <MultiSelectModal
        limit={1}
        min={1}
        open={activeModal === 'scenario'}
        options={scenarioOptions}
        title="First Roleplay"
        value={draft.scenario ? [draft.scenario] : []}
        onChange={(scenario) => patchDraft({ scenario: scenario[0] ?? '' })}
        onClose={() => setActiveModal(null)}
      />
      <MultiSelectModal
        clearValue={CharacterFetish.None}
        limit={3}
        open={activeModal === 'fetishes'}
        options={fetishOptions}
        title="Fetishes"
        value={draft.fetishes as CharacterFetish[]}
        onChange={(fetishes) => patchDraft({ fetishes })}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
