import { useNavigate } from 'react-router-dom';

import { cn } from '@/common/utils';

import s from './NoirBottomDock.module.scss';

export type NoirDockItem = {
  label: string;
  path: string;
  icon: string;
  create?: boolean;
};

type NoirBottomDockProps = {
  items: NoirDockItem[];
  activePath: string;
};

export function NoirBottomDock({ items, activePath }: NoirBottomDockProps) {
  const navigate = useNavigate();

  return (
    <nav aria-label="Mobile navigation" className={s.dock}>
      {items.map((item) => {
        const isActive = activePath === item.path;
        const isCreate = Boolean(item.create);

        return (
          <button
            key={item.path}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            className={cn(s.item, [], {
              [s.active]: isActive,
              [s.create]: isCreate,
            })}
            onClick={() => navigate(item.path)}
          >
            <span className={s.iconWrap} aria-hidden="true">
              <span
                className={cn('material-symbols-outlined', [s.itemIcon], {
                  filled: isActive || isCreate,
                  [s.activeIcon]: isActive && !isCreate,
                })}
              >
                {item.icon}
              </span>
            </span>
            <span className={s.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
