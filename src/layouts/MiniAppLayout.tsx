import TelegramWebApp from '@twa-dev/sdk';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import logo from '@/assets/logo.jpg';
import {
  NoirBottomDock,
  type NoirDockItem,
  NoirTopBar,
} from '@/components/noir';
import { useUser } from '@/context/UserContext';

import s from './MiniAppLayout.module.scss';

export function MiniAppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const dockItems: NoirDockItem[] = [
    { label: t('layout.dock.explore'), path: '/explore', icon: 'explore' },
    { label: t('layout.dock.collection'), path: '/collection', icon: 'image' },
    {
      label: t('layout.dock.create'),
      path: '/my-girls',
      icon: 'add_box',
      create: true,
    },
    { label: t('layout.dock.shop'), path: '/shop', icon: 'redeem' },
    { label: t('layout.dock.profile'), path: '/profile', icon: 'person' },
  ];

  useEffect(() => {
    const setVh = () => {
      const viewportHeight = TelegramWebApp.viewportHeight;
      const height =
        typeof viewportHeight === 'number' && viewportHeight > 0
          ? viewportHeight
          : window.innerHeight;

      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
    };

    TelegramWebApp.expand();
    setVh();
    window.addEventListener('resize', setVh);
    TelegramWebApp.onEvent('viewportChanged', setVh);

    return () => {
      window.removeEventListener('resize', setVh);
      TelegramWebApp.offEvent('viewportChanged', setVh);
    };
  }, []);

  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const isCustomCompanion =
    searchParams.get('isCustom') === '1' ||
    searchParams.get('isCustom') === 'true';
  const isSubscriptions = pathname === '/subscriptions';
  const isCompanion =
    pathname.startsWith('/companions/') || pathname.startsWith('/girls/');
  const isCatalogCompanion = isCompanion && !isCustomCompanion;
  const isScenarioDetails = pathname.startsWith('/scenarios/');
  const isExplore = pathname === '/explore';
  const isCreateWizard = pathname === '/create-character';
  const showDock = !isSubscriptions && !isCatalogCompanion;
  const activeDockPath =
    dockItems.find(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    )?.path ??
    (isScenarioDetails
      ? ''
      : isCreateWizard || isCustomCompanion
        ? '/my-girls'
        : '/explore');

  return (
    <div className={s.viewport}>
      <div className={s.shell}>
        <div className={s.ambient} />
        {isSubscriptions ? (
          <NoirTopBar mode="back" title={t('layout.upgradePremium')} />
        ) : isCatalogCompanion ? (
          <NoirTopBar mode="back" title={t('layout.scenarios')} />
        ) : (
          <NoirTopBar
            avatarSrc={logo}
            credits={user?.air ?? 0}
            onCreditsClick={() => navigate('/shop')}
            onUpgradeClick={() => navigate('/subscriptions')}
            showUpgrade={Boolean(user && !user.isSubscribed)}
          />
        )}

        <main
          className={`${s.content} ${showDock ? '' : s.focused} ${
            isExplore ? s.noTopPadding : ''
          } ${isExplore ? s.compactXPadding : ''}`}
        >
          <Outlet />
        </main>

        {showDock ? (
          <NoirBottomDock items={dockItems} activePath={activeDockPath} />
        ) : null}
      </div>
    </div>
  );
}
