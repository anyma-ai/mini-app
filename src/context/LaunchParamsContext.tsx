import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { postMeDeeplink } from '@/api/me';
import type { LaunchParams } from '@/common/types';

const STORAGE_KEY = 'aera_launch_params';
const BROADCAST_DEEPLINK_STATUS_KEY_PREFIX = 'aera_broadcast_deeplink:';

type LaunchParamsContextValue = {
  params: LaunchParams;
};

const LaunchParamsContext = createContext<LaunchParamsContextValue | undefined>(
  undefined
);

function normalizeValue(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readFromUrl(): LaunchParams | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const characterName = normalizeValue(search.get('character'));
  const scenarioId = normalizeValue(search.get('scenario'));
  if (!characterName && !scenarioId) return null;
  return { characterName, scenarioId };
}

function readBroadcastRefFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const isBroad = search.get('broad')?.trim().toLowerCase() === 'true';
  const ref = normalizeValue(search.get('ref'));
  if (!isBroad || !ref) return null;
  return ref;
}

function readFromStorage(): LaunchParams | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LaunchParams;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      characterName: normalizeValue(parsed.characterName ?? null),
      scenarioId: normalizeValue(parsed.scenarioId ?? null),
    };
  } catch {
    return null;
  }
}

function writeToStorage(params: LaunchParams) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // ignore storage errors
  }
}

export function LaunchParamsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [params] = useState<LaunchParams>(() => {
    const fromUrl = readFromUrl();
    if (fromUrl) {
      writeToStorage(fromUrl);
      return fromUrl;
    }
    const fromStorage = readFromStorage();
    return fromStorage ?? {};
  });

  const value = useMemo(() => ({ params }), [params]);

  useEffect(() => {
    const ref = readBroadcastRefFromUrl();
    if (!ref || typeof window === 'undefined') return;

    const storageKey = `${BROADCAST_DEEPLINK_STATUS_KEY_PREFIX}${ref}`;
    const currentStatus = window.sessionStorage.getItem(storageKey);
    if (currentStatus === 'pending' || currentStatus === 'sent') return;

    window.sessionStorage.setItem(storageKey, 'pending');

    void postMeDeeplink(ref)
      .then(() => {
        window.sessionStorage.setItem(storageKey, 'sent');
      })
      .catch(() => {
        window.sessionStorage.removeItem(storageKey);
      });
  }, []);

  return (
    <LaunchParamsContext.Provider value={value}>
      {children}
    </LaunchParamsContext.Provider>
  );
}

export function useLaunchParams() {
  const context = useContext(LaunchParamsContext);
  if (!context) {
    throw new Error('useLaunchParams must be used within LaunchParamsProvider');
  }
  return context.params;
}
