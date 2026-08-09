import TelegramWebApp from '@twa-dev/sdk';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import logo from '@/assets/logo.jpg';
import {
  NoirBottomDock,
  type NoirDockItem,
  NoirTopBar,
} from '@/components/noir';
import { useUser } from '@/context/UserContext';

import s from './MiniAppLayout.module.scss';

const dockItems: NoirDockItem[] = [
  { label: 'Explore', path: '/explore', icon: 'explore' },
  { label: 'Magic', path: '/magic', icon: 'auto_awesome' },
  { label: 'Create', path: '/my-girls', icon: 'add_box', create: true },
  { label: 'Shop', path: '/shop', icon: 'redeem' },
  { label: 'Profile', path: '/profile', icon: 'person' },
];

export function MiniAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();

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
  const isCreateWizard = pathname === '/create-character';
  const showDock =
    !isSubscriptions && !isCatalogCompanion && !isCreateWizard;
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
          <NoirTopBar mode="back" title="Upgrade Premium" />
        ) : isCatalogCompanion ? (
          <NoirTopBar mode="back" title="Scenarios" />
        ) : isCreateWizard ? (
          <NoirTopBar
            mode="back"
            title="Create"
            onBack={() => navigate('/explore')}
          />
        ) : (
          <NoirTopBar
            avatarSrc={logo}
            credits={user?.air ?? 0}
            onCreditsClick={() => navigate('/shop')}
          />
        )}

        <main className={`${s.content} ${showDock ? '' : s.focused}`}>
          <Outlet />
        </main>

        {showDock ? (
          <NoirBottomDock items={dockItems} activePath={activeDockPath} />
        ) : null}
      </div>
    </div>
  );
}
