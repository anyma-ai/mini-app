import { useNavigate } from 'react-router-dom';

import { cn } from '@/common/utils';

import s from './NoirBottomDock.module.scss';

export type NoirDockItem = {
  label: string;
  path: string;
  icon: string;
};

type NoirBottomDockProps = {
  items: NoirDockItem[];
  activePath: string;
};

export function NoirBottomDock({ items, activePath }: NoirBottomDockProps) {
  const navigate = useNavigate();

  return (
    <nav className={s.dock}>
      {items.map((item) => {
        const isActive = activePath === item.path;

        return (
          <button
            key={item.path}
            type="button"
            className={cn(s.item, [], { [s.active]: isActive })}
            onClick={() => navigate(item.path)}
          >
            <span
              className={cn('material-symbols-outlined', [s.itemIcon], {
                filled: isActive,
                [s.activeIcon]: isActive,
              })}
            >
              {item.icon}
            </span>
            {/*<span className={cn(s.label, [], { [s.labelHidden]: isActive })}>*/}
            {/*  {item.label}*/}
            {/*</span>*/}
          </button>
        );
      })}
    </nav>
  );
}
