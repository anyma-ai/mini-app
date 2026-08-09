import { useNavigate } from 'react-router-dom';

import {
  CircleUserRoundIcon,
  CompassIcon,
  GiftIcon,
  ImageIcon,
  SquarePlayIcon,
  SquarePlusIcon,
} from '@/assets/icons';
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

const iconMap = {
  add_box: SquarePlusIcon,
  auto_awesome: SquarePlayIcon,
  explore: CompassIcon,
  image: ImageIcon,
  person: CircleUserRoundIcon,
  redeem: GiftIcon,
};

export function NoirBottomDock({ items, activePath }: NoirBottomDockProps) {
  const navigate = useNavigate();

  return (
    <nav aria-label="Mobile navigation" className={s.dock}>
      {items.map((item) => {
        const isActive = activePath === item.path;
        const isCreate = Boolean(item.create);
        const Icon = iconMap[item.icon as keyof typeof iconMap];

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
              {Icon ? <Icon className={s.icon} /> : null}
            </span>
            <span className={s.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
