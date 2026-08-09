import type {
  ContentItemType,
  Explicitness,
  Paginated,
  ScenarioDetails,
  ScenarioMedia,
  ScenarioMediaTotals,
  UnblurScenarioVideoResponse,
  UnlockScenarioResponse,
} from '@/common/types';

import { apiFetch } from './client';

const SCENARIOS_PATH = '/characters/scenarios';

export const SCENARIO_MEDIA_DEFAULT_TAKE = 32;

export type ScenarioMediaQuery = {
  explicitness?: Explicitness;
  skip?: number;
  take?: number;
};

export class ApiResponseError extends Error {
  details?: unknown;
  status: number;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
    this.details = details;
  }
}

function unwrapData<T>(value: T | { data: T }): T {
  if (
    value &&
    typeof value === 'object' &&
    'data' in value &&
    Object.keys(value).length === 1
  ) {
    return (value as { data: T }).data;
  }

  return value as T;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;

  const record = payload as Record<string, unknown>;
  const message = record.message ?? record.error;

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}

async function parseJsonResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new ApiResponseError(
      getErrorMessage(payload, fallbackError),
      response.status,
      payload,
    );
  }

  return unwrapData(payload as T | { data: T });
}

function buildMediaQuery(params: ScenarioMediaQuery = {}) {
  const search = new URLSearchParams();

  if (params.explicitness) {
    search.set('explicitness', params.explicitness);
  }

  if (typeof params.skip === 'number') {
    search.set('skip', String(params.skip));
  }

  if (typeof params.take === 'number') {
    search.set('take', String(params.take));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

export const scenarioKeys = {
  all: ['scenarios'] as const,
  details: () => [...scenarioKeys.all, 'detail'] as const,
  detail: (id: string) => [...scenarioKeys.details(), id] as const,
  mediaLists: () => [...scenarioKeys.all, 'media'] as const,
  media: (
    id: string,
    type: ContentItemType,
    params: ScenarioMediaQuery = {},
  ) => [...scenarioKeys.mediaLists(), id, type, params] as const,
  mediaTotals: (id: string) =>
    [...scenarioKeys.all, 'media-totals', id] as const,
};

export async function getScenarioDetails(id: string) {
  const response = await apiFetch(`${SCENARIOS_PATH}/${id}`);
  return parseJsonResponse<ScenarioDetails>(
    response,
    'Failed to load scenario',
  );
}

export async function getScenarioMedia(
  id: string,
  type: ContentItemType,
  params: ScenarioMediaQuery = {},
) {
  const query = buildMediaQuery({
    skip: 0,
    take: SCENARIO_MEDIA_DEFAULT_TAKE,
    ...params,
  });
  const endpoint = type === 'video' ? 'video' : 'image';
  const response = await apiFetch(`${SCENARIOS_PATH}/${id}/${endpoint}${query}`);
  return parseJsonResponse<Paginated<ScenarioMedia>>(
    response,
    'Failed to load scenario media',
  );
}

export async function getScenarioMediaTotals(id: string) {
  const response = await apiFetch(`${SCENARIOS_PATH}/${id}/media-totals`);
  return parseJsonResponse<ScenarioMediaTotals>(
    response,
    'Failed to load scenario media totals',
  );
}

export async function unlockScenario(id: string) {
  const response = await apiFetch(`${SCENARIOS_PATH}/${id}/unlock`, {
    method: 'POST',
  });
  return parseJsonResponse<UnlockScenarioResponse | null>(
    response,
    'Failed to unlock scenario',
  );
}

export async function unblurScenarioVideo(id: string, videoId: string) {
  const response = await apiFetch(
    `${SCENARIOS_PATH}/${id}/video/${videoId}/unblur`,
    {
      method: 'POST',
    },
  );
  return parseJsonResponse<UnblurScenarioVideoResponse>(
    response,
    'Failed to unlock video',
  );
}
