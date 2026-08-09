import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import type {
  ContentItemType,
  Explicitness,
  ICollectionItem,
  IContentItem,
  Paginated,
} from '@/common/types';

import { apiFetch } from './client';

const CONTENT_ITEMS_PATH = '/content-items';

export const COLLECTION_ITEMS_DEFAULT_TAKE = 32;

export type CollectionItemsQuery = {
  characterId?: string;
  explicitness?: Explicitness;
  isSaved?: boolean;
  scenarioId?: string;
  skip?: number;
  take?: number;
  type?: ContentItemType;
};

export type SaveContentItemPayload = {
  isSaved: boolean;
};

export type SaveContentItemResponse = {
  success: true;
};

export type UnblurContentItemResponse = {
  item: IContentItem;
  user?: unknown;
};

type CollectionInfiniteData = InfiniteData<Paginated<ICollectionItem>>;
type CollectionListSnapshot = Array<
  readonly [QueryKey, CollectionInfiniteData | undefined]
>;

function normalizeCollectionQuery(params: CollectionItemsQuery = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null),
  ) as CollectionItemsQuery;
}

function buildListQuery(params: CollectionItemsQuery = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
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
    const message =
      payload &&
      typeof payload === 'object' &&
      typeof ((payload as Record<string, unknown>).message ??
        (payload as Record<string, unknown>).error) === 'string'
        ? String(
            (payload as Record<string, unknown>).message ??
              (payload as Record<string, unknown>).error,
          )
        : fallbackError;

    throw new Error(message);
  }

  return unwrapData(payload as T | { data: T });
}

function isSavedOnlyCollectionQuery(queryKey: QueryKey) {
  const params = queryKey[2];

  return Boolean(
    params &&
      typeof params === 'object' &&
      'isSaved' in params &&
      (params as CollectionItemsQuery).isSaved === true,
  );
}

export const contentItemKeys = {
  all: ['content-items'] as const,
  lists: () => [...contentItemKeys.all, 'list'] as const,
  list: (params: CollectionItemsQuery = {}) =>
    [...contentItemKeys.lists(), normalizeCollectionQuery(params)] as const,
};

export async function getCollectionItems(
  params: CollectionItemsQuery = {},
): Promise<Paginated<ICollectionItem>> {
  const response = await apiFetch(
    `${CONTENT_ITEMS_PATH}${buildListQuery(params)}`,
  );
  return parseJsonResponse<Paginated<ICollectionItem>>(
    response,
    'Failed to load collection',
  );
}

export async function saveContentItem(
  id: string,
  payload: SaveContentItemPayload,
): Promise<SaveContentItemResponse> {
  const response = await apiFetch(`${CONTENT_ITEMS_PATH}/${id}/save`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return parseJsonResponse<SaveContentItemResponse>(
    response,
    'Failed to save media',
  );
}

export async function unblurContentItem(
  id: string,
): Promise<UnblurContentItemResponse> {
  const response = await apiFetch(`${CONTENT_ITEMS_PATH}/${id}/unblur`, {
    method: 'POST',
  });

  return parseJsonResponse<UnblurContentItemResponse>(
    response,
    'Failed to unlock media',
  );
}

export function patchCollectionItemSavedInCache(
  queryClient: QueryClient,
  id: string,
  isSaved: boolean,
) {
  const listQueries = queryClient.getQueriesData<CollectionInfiniteData>({
    queryKey: contentItemKeys.lists(),
  });

  for (const [queryKey, current] of listQueries) {
    if (!current) continue;

    let changed = false;
    const shouldRemove = !isSaved && isSavedOnlyCollectionQuery(queryKey);
    const pages = current.pages.map((page) => {
      const hasItem = page.data.some((item) => item.id === id);

      if (!hasItem) return page;

      changed = true;

      if (shouldRemove) {
        return {
          ...page,
          data: page.data.filter((item) => item.id !== id),
          total: Math.max(0, page.total - 1),
        };
      }

      return {
        ...page,
        data: page.data.map((item) =>
          item.id === id
            ? {
                ...item,
                isSaved,
              }
            : item,
        ),
      };
    });

    if (!changed) continue;

    queryClient.setQueryData<CollectionInfiniteData>(queryKey, {
      ...current,
      pages,
    });
  }
}

export function useCollectionItemsInfiniteQuery(
  params: Omit<CollectionItemsQuery, 'skip' | 'take'> = {},
  enabled = true,
) {
  const initialPageParam = {
    skip: 0,
    take: COLLECTION_ITEMS_DEFAULT_TAKE,
  };

  return useInfiniteQuery({
    queryKey: contentItemKeys.list({ ...params, ...initialPageParam }),
    queryFn: ({ pageParam }) =>
      getCollectionItems({
        ...params,
        ...pageParam,
      }),
    enabled,
    initialPageParam,
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.take;

      if (nextSkip >= lastPage.total) return undefined;

      return {
        skip: nextSkip,
        take: lastPage.take,
      };
    },
  });
}

export function useSaveContentItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: SaveContentItemPayload;
    }) => saveContentItem(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: contentItemKeys.lists() });

      const previousLists = queryClient.getQueriesData<CollectionInfiniteData>({
        queryKey: contentItemKeys.lists(),
      }) as CollectionListSnapshot;

      patchCollectionItemSavedInCache(queryClient, id, payload.isSaved);

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: contentItemKeys.lists() });
    },
  });
}
