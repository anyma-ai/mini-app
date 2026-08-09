import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import TelegramWebApp from '@twa-dev/sdk';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { createCharacterScenario, getCustomCharacters } from '@/api/custom-character';
import { getGirls } from '@/api/girls';
import { SparklesIcon } from '@/assets/icons';
import type { CustomScenarioType } from '@/common/consts/character';
import { useCharacterTypeParam } from '@/common/hooks/useCharacterTypeParam';
import {
  CUSTOM_SCENARIO_PRICE,
  type ICharacter,
  type IScenario,
} from '@/common/types';
import { useUser } from '@/context/UserContext';
import { MultiSelectModal } from '@/pages/create-character/components/multi-select-modal';
import { scenarioOptions } from '@/pages/create-character/create-character.data';

import s from './CompanionPage.module.scss';

function parseDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildCreateScenarioUpgradeUrl(characterId: string) {
  const returnTo = `/companions/${characterId}?isCustom=1`;
  const query = new URLSearchParams({
    paywall: 'create-scenario',
    returnTo,
  });

  return `/subscriptions?${query.toString()}`;
}

export function CompanionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refresh } = useUser();
  const [searchParams] = useSearchParams();
  const preferCustom =
    searchParams.get('isCustom') === '1' ||
    searchParams.get('isCustom') === 'true';
  const { characterType } = useCharacterTypeParam();
  const { id } = useParams<{ id: string }>();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<
    CustomScenarioType | ''
  >('');

  const catalogQuery = useQuery({
    queryKey: ['girls', characterType],
    queryFn: () => getGirls(characterType),
  });

  const customQuery = useQuery({
    queryKey: ['custom-characters'],
    queryFn: getCustomCharacters,
  });

  const catalogGirls = useMemo(
    () => catalogQuery.data ?? [],
    [catalogQuery.data],
  );
  const customGirls = useMemo(() => customQuery.data ?? [], [customQuery.data]);

  const companion = useMemo(() => {
    if (preferCustom) {
      return (
        customGirls.find((girl) => girl.id === id) ??
        catalogGirls.find((girl) => girl.id === id)
      );
    }

    return (
      catalogGirls.find((girl) => girl.id === id) ??
      customGirls.find((girl) => girl.id === id)
    );
  }, [catalogGirls, customGirls, id, preferCustom]);

  const isCustom = Boolean(
    companion && customGirls.some((girl) => girl.id === companion.id),
  );

  const isLoading = catalogQuery.isLoading || customQuery.isLoading;
  const isError = catalogQuery.isError && customQuery.isError;
  const error = catalogQuery.error ?? customQuery.error;

  const scenarios = useMemo(() => {
    if (!companion?.scenarios) return [];
    return [...companion.scenarios].sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return parseDate(b.createdAt) - parseDate(a.createdAt);
    });
  }, [companion]);

  const createScenario = useMutation({
    mutationFn: (scenario: CustomScenarioType) =>
      createCharacterScenario(id!, { description: scenario }),
    onSuccess: async (character) => {
      setModalOpen(false);
      setSelectedScenario('');
      queryClient.setQueryData<ICharacter[]>(['custom-characters'], (prev) => {
        if (!prev) return [character];
        const exists = prev.some((item) => item.id === character.id);
        if (!exists) return [...prev, character];
        return prev.map((item) =>
          item.id === character.id ? character : item,
        );
      });
      await queryClient.invalidateQueries({ queryKey: ['custom-characters'] });
      await refresh();
    },
  });

  const handleCreateScenario = useCallback(async () => {
    if (!selectedScenario || createScenario.isPending || !user || !id) {
      return;
    }

    if ((user.air ?? 0) >= CUSTOM_SCENARIO_PRICE) {
      await createScenario.mutateAsync(selectedScenario);
      return;
    }

    setModalOpen(false);

    if (!user.isSubscribed) {
      navigate(buildCreateScenarioUpgradeUrl(id));
      return;
    }

    navigate('/shop');
  }, [createScenario, id, navigate, selectedScenario, user]);

  const openScenario = (scenario: IScenario) => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME;

    if (!botUsername || !scenario.slug) {
      return;
    }

    TelegramWebApp.openTelegramLink(
      `https://t.me/${botUsername}?start=${scenario.slug}`,
    );
    TelegramWebApp.close();
  };

  if (isLoading) {
    return <div className={s.empty}>Inviting your companion into focus...</div>;
  }

  if (isError) {
    return (
      <div className={s.empty}>
        {error instanceof Error ? error.message : 'Failed to load companion'}
      </div>
    );
  }

  if (!companion) {
    return <div className={s.empty}>This aura is no longer available.</div>;
  }

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <img
          src={companion.promoImgUrl ?? companion.avatarUrl}
          alt={companion.name}
          className={s.heroImage}
        />
        <div className={s.heroOverlay} />
        <div className={s.heroBody}>
          <span className={s.badge}>Scenarios</span>
          <div>
            <h1 className={s.name}>{companion.name}</h1>
            <p className={s.description}>{companion.description}</p>
          </div>
        </div>
      </section>

      <section className={s.stack}>
        <h2 className={s.sectionTitle}>Choose Your Path</h2>
        {scenarios.map((scenario) => (
          <article
            key={scenario.id}
            className={s.scenario}
            onClick={() => {
              if (scenario.isActive && !isCustom) {
                navigate(`/scenarios/${scenario.id}`);
              }
            }}
          >
            <img
              src={scenario.promoImgHorizontalUrl || scenario.promoImgUrl || scenario.openingImageUrl}
              alt={scenario.name}
              className={s.scenarioImage}
            />
            <div className={s.scenarioOverlay} />
            <div className={s.scenarioBody}>
              <div>
                <h3 className={s.scenarioName}>{scenario.name}</h3>
                <p className={s.scenarioDescription}>
                  {scenario.shortDescription || scenario.description}
                </p>
              </div>
              <div className={s.actions}>
                {scenario.isActive ? (
                  <button
                    type="button"
                    className={s.action}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isCustom) {
                        openScenario(scenario);
                        return;
                      }

                      navigate(`/scenarios/${scenario.id}`);
                    }}
                  >
                    {isCustom ? 'Start Scenario' : 'Open Scenario'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={s.secondaryAction}
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate('/subscriptions');
                    }}
                  >
                    Unlock Intimacy
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}

        {isCustom ? (
          <article className={`${s.scenario} ${s.newRoleplay}`}>
            <div className={s.newRoleplayBody}>
              <span className={s.newRoleplayIcon} aria-hidden="true">
                <span className="material-symbols-outlined filled">
                  auto_awesome
                </span>
              </span>
              <h3 className={s.newRoleplayTitle}>New Roleplay</h3>
              <p className={s.newRoleplayDescription}>
                Get even more emotions with {companion.name}
              </p>
              <button
                type="button"
                className={s.newRoleplayButton}
                disabled={createScenario.isPending}
                onClick={() => setModalOpen(true)}
              >
                {createScenario.isPending ? 'Creating...' : 'Create New'}
              </button>
              <span className={s.newRoleplayPrice}>
                <SparklesIcon aria-hidden="true" />
                <span>{CUSTOM_SCENARIO_PRICE}</span>
              </span>
            </div>
          </article>
        ) : null}
      </section>

      {isCustom ? (
        <MultiSelectModal<CustomScenarioType>
          actionLabel="Create New"
          actionLoading={createScenario.isPending}
          limit={1}
          min={1}
          open={modalOpen}
          options={scenarioOptions}
          title={`Create roleplay with ${companion.name}`}
          value={selectedScenario ? [selectedScenario] : []}
          onChange={(value) => setSelectedScenario(value[0] ?? '')}
          onClose={() => {
            setModalOpen(false);
            setSelectedScenario('');
          }}
          onSubmit={() => {
            void handleCreateScenario();
          }}
        />
      ) : null}
    </div>
  );
}
