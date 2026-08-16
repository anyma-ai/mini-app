import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { CloseIcon } from '../CloseIcon';
import { Typography } from '../typography/Typography';
import s from './Modal.module.scss';

type ModalProps = {
  open: boolean;
  title?: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function Modal({
  open,
  title,
  ariaLabel,
  children,
  actions,
  onClose,
  className,
  headerClassName,
  contentClassName,
}: ModalProps) {
  const { t } = useTranslation();
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const overlayClassName = [s.overlay, s.overlayOpen].filter(Boolean).join(" ");
  const modalClassName = [s.modal, s.modalOpen, className]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className={overlayClassName}
      role="dialog"
      aria-modal="true"
      aria-label={!title ? ariaLabel : undefined}
      aria-labelledby={title ? titleId : undefined}
      onClick={onClose}
    >
      <div className={modalClassName} onClick={(event) => event.stopPropagation()}>
        <div className={[s.header, headerClassName].filter(Boolean).join(" ")}>
          {title ? (
            <Typography id={titleId} variant="h3">
              {title}
            </Typography>
          ) : null}
          <button
            className={s.close}
            type="button"
            onClick={onClose}
            aria-label={t('common.closeModal')}
          >
            <CloseIcon />
          </button>
        </div>
        <div className={contentClassName}>{children}</div>
        {actions ? <div className={s.actions}>{actions}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
