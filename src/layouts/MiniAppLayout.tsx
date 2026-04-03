import TelegramWebApp from '@twa-dev/sdk';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import oliviaImage from '@/assets/characters/olivia.webp';
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
  const isSubscriptions = pathname === '/subscriptions';
  const isCompanion =
    pathname.startsWith('/companions/') || pathname.startsWith('/girls/');
  const showDock = !isSubscriptions && !isCompanion;
  const activeDockPath =
    dockItems.find(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    )?.path ?? '/explore';

  return (
    <div className={s.viewport}>
      <div className={s.shell}>
        <div className={s.ambient} />
        {isSubscriptions ? (
          <NoirTopBar mode="back" title="Upgrade Aura" />
        ) : isCompanion ? (
          <NoirTopBar mode="back" title="Scenarios" />
        ) : (
          <NoirTopBar
            avatarSrc={oliviaImage}
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
