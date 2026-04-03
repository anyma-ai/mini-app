import { CharacterType } from '@/common/types';
import { cn } from '@/common/utils';

import s from './CharacterTypeSwitch.module.scss';

type CharacterTypeSwitchProps = {
  value: CharacterType;
  onChange: (nextType: CharacterType) => void;
  className?: string;
};

const options = [
  {
    value: CharacterType.Realistic,
    label: 'Natural',
    icon: 'face_retouching_natural',
  },
  {
    value: CharacterType.Anime,
    label: 'Anime',
    icon: 'auto_awesome',
  },
] as const;

export function CharacterTypeSwitch({
  value,
  onChange,
  className,
}: CharacterTypeSwitchProps) {
  return (
    <div className={`${s.switch} ${className ?? ''}`}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            className={cn(s.option, [], { [s.optionActive]: isActive })}
            onClick={() => onChange(option.value)}
          >
            <span
              className={cn('material-symbols-outlined', [s.icon], {
                filled: isActive,
              })}
            >
              {option.icon}
            </span>
            <span className={s.label}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
