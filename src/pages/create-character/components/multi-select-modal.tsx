import { useMemo, useState } from 'react';

import { cn } from '@/common/utils';

import styles from '../create-character.module.scss';
import type { TextOption } from '../create-character.types';
import { Button, Input, Modal, Typography } from '../ui';

export function MultiSelectModal<T extends string>({
  actionLabel = 'Done',
  actionLoading = false,
  clearValue,
  limit,
  min = 0,
  onClose,
  onChange,
  onSubmit,
  open,
  options,
  title,
  value,
}: {
  actionLabel?: string;
  actionLoading?: boolean;
  clearValue?: T;
  limit: number;
  min?: number;
  onClose: () => void;
  onChange: (value: T[]) => void;
  onSubmit?: () => void;
  open: boolean;
  options: Array<TextOption<T>>;
  title: string;
  value: T[];
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(
    () =>
      normalizedQuery
        ? options.filter((option) =>
            option.label.toLowerCase().includes(normalizedQuery),
          )
        : options,
    [normalizedQuery, options],
  );

  const toggle = (nextValue: T) => {
    if (clearValue && nextValue === clearValue) {
      onChange([]);
      return;
    }

    const withoutClearValue = clearValue
      ? value.filter((item) => item !== clearValue)
      : value;
    const selected = withoutClearValue.includes(nextValue);

    if (selected) {
      onChange(withoutClearValue.filter((item) => item !== nextValue));
      return;
    }

    if (limit === 1) {
      onChange([nextValue]);
      return;
    }

    if (withoutClearValue.length >= limit) {
      return;
    }

    onChange([...withoutClearValue, nextValue]);
  };

  return (
    <Modal
      actions={
        <Button
          disabled={value.length < min}
          fullWidth
          loading={actionLoading}
          shape="pill"
          type="button"
          onClick={onSubmit ?? onClose}
        >
          {actionLabel}
        </Button>
      }
      open={open}
      title={title}
      onClose={onClose}
    >
      <div className={styles.modalBody}>
        <Input
          aria-label={`Search ${title}`}
          fullWidth
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {limit > 1 ? (
          <Typography tone="muted" variant="caption">
            {value.length}/{limit} selected
          </Typography>
        ) : null}
        <div className={styles.modalOptionGrid}>
          {filteredOptions.map((option) => {
            const active = value.includes(option.value);
            const disabled =
              limit > 1 &&
              !active &&
              value.length >= limit &&
              option.value !== clearValue;

            return (
              <button
                aria-pressed={active}
                className={cn(styles.modalOption, undefined, {
                  [styles.modalOptionActive]: active,
                })}
                disabled={disabled}
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
              >
                {option.icon ? (
                  <span aria-hidden="true">{option.icon}</span>
                ) : null}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
