import { useQuery, useQueryClient } from '@tanstack/react-query';
import i18n from 'i18next';
import { createContext, useContext, useEffect } from 'react';

import { getMe, patchMe, patchMeCountryOnce } from '@/api/me';
import type { IUser, Language } from '@/common/types';
import { normalizeLanguage } from '@/i18n/languages';

export type UserContextValue = {
  user: IUser | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateLanguage: (languageUI: Language) => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);
const countryPatchKey = 'country-patch-session-v1';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  useEffect(() => {
    void i18n.changeLanguage(normalizeLanguage(data?.languageUI));
  }, [data?.languageUI]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(countryPatchKey)) return;
    sessionStorage.setItem(countryPatchKey, '1');
    void patchMeCountryOnce().catch(() => {});
  }, []);

  const refresh = async () => {
    await refetch();
  };

  const updateLanguage = async (languageUI: Language) => {
    const previousUser = queryClient.getQueryData<IUser>(['me']);
    const nextLanguage = normalizeLanguage(languageUI);

    if (previousUser) {
      queryClient.setQueryData<IUser>(['me'], {
        ...previousUser,
        languageUI: nextLanguage,
      });
    }
    await i18n.changeLanguage(nextLanguage);

    try {
      const updatedUser = await patchMe({ languageUI: nextLanguage });
      queryClient.setQueryData<IUser>(['me'], updatedUser);
    } catch (updateError) {
      if (previousUser) {
        queryClient.setQueryData<IUser>(['me'], previousUser);
        await i18n.changeLanguage(normalizeLanguage(previousUser.languageUI));
      }
      throw updateError;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user: data ?? null,
        isLoading,
        error:
          error instanceof Error
            ? error.message
            : error
              ? 'Failed to load user'
              : null,
        refresh,
        updateLanguage,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
