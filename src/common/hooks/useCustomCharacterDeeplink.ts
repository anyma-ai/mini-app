import TelegramWebApp from '@twa-dev/sdk';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { postMeDeeplink } from '@/api/me';

const REDIRECT_KEY_PREFIX = 'aera_cc_redirect:';
const TRACK_KEY_PREFIX = 'aera_cc_deeplink:';

// pages the app opens on: the link takes the user to the wizard from there
const LANDING_PATHS = ['/', '/explore'];

/**
 * Post link "t.me/<bot>?startapp=cc__<ref>__<postPublicId>" (create character
 * posts). Without a post id it is "cc__<ref>".
 */
export function parseCustomCharacterStartParam(raw?: string | null) {
  const value = raw?.trim();
  if (!value?.startsWith('cc__')) return null;

  const [, ref, postId] = value.split('__');
  if (!ref) return null;

  return { ref, postId: postId || undefined };
}

function readStartParam() {
  const fromTelegram = TelegramWebApp.initDataUnsafe?.start_param;
  if (fromTelegram) return fromTelegram;

  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('tgWebAppStartParam');
}

function storageGet(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

/**
 * Opened from a create character post: counts the visit for the partner ref
 * and the post, and opens the create wizard. Both once per launch: a remount
 * or a reload in the same session does neither again.
 */
export function useCustomCharacterDeeplink() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const startParam = readStartParam();
    const link = parseCustomCharacterStartParam(startParam);
    if (!startParam || !link) return;

    const trackKey = `${TRACK_KEY_PREFIX}${startParam}`;
    const trackStatus = storageGet(trackKey);

    if (trackStatus !== 'pending' && trackStatus !== 'sent') {
      storageSet(trackKey, 'pending');

      void postMeDeeplink({ ref: link.ref, type: 'cc', postId: link.postId })
        .then(() => storageSet(trackKey, 'sent'))
        // the next launch in this session tries again
        .catch(() => storageSet(trackKey, null));
    }

    const redirectKey = `${REDIRECT_KEY_PREFIX}${startParam}`;

    if (storageGet(redirectKey) || !LANDING_PATHS.includes(pathname)) return;

    storageSet(redirectKey, '1');
    navigate('/create-character', { replace: true });
    // on launch only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
