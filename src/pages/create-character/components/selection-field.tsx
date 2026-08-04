import { cn } from '@/common/utils';

import styles from '../create-character.module.scss';

export function SelectionField({
  emptyText,
  emojis,
  label,
  onOpen,
  values,
}: {
  emptyText: string;
  emojis: string[];
  label: string;
  onOpen: () => void;
  values: string[];
}) {
  return (
    <button className={styles.selectionField} type="button" onClick={onOpen}>
      <span className={styles.selectionLabel}>{label}</span>
      <strong
        className={cn(styles.selectionValue, undefined, {
          [styles.selectionValueEmpty]: !values.length,
        })}
      >
        {values.length ? values.join(', ') : emptyText}
      </strong>
      {emojis.length ? (
        <span className={styles.selectionEmojiRow} aria-hidden="true">
          {emojis.map((emoji, index) => (
            <span className={styles.selectionEmoji} key={`${emoji}-${index}`}>
              {emoji}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}
