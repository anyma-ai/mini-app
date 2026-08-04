import type { ComponentProps, ElementType } from 'react';

import s from './Typography.module.scss';

type TypographyVariant =
  | 'display-xl'
  | 'display-lg'
  | 'headline-md'
  | 'body-lg'
  | 'body-md'
  | 'label-md'
  | 'label-sm'
  | 'overline'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'meta'
  | 'caption'
  | 'control';

type TypographyTone =
  | 'default'
  | 'muted'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

type TypographyAlign = 'left' | 'center' | 'right';

type TypographyProps<T extends ElementType> = {
  as?: T;
  variant?: TypographyVariant;
  tone?: TypographyTone;
  align?: TypographyAlign;
  truncate?: boolean;
  readingWidth?: boolean;
} & Omit<ComponentProps<T>, 'as' | 'color'>;

const variantClassMap: Record<TypographyVariant, string> = {
  'display-xl': s.displayXl,
  'display-lg': s.displayLg,
  'headline-md': s.headlineMd,
  'body-lg': s.bodyLg,
  'body-md': s.bodyMd,
  'label-md': s.labelMd,
  'label-sm': s.labelSm,
  overline: s.overline,
  h1: s.h1,
  h2: s.h2,
  h3: s.h3,
  body: s.body,
  meta: s.meta,
  caption: s.caption,
  control: s.control,
};

const defaultTagMap: Record<TypographyVariant, ElementType> = {
  'display-xl': 'h1',
  'display-lg': 'h2',
  'headline-md': 'h3',
  'body-lg': 'p',
  'body-md': 'p',
  'label-md': 'span',
  'label-sm': 'span',
  overline: 'span',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  meta: 'p',
  caption: 'p',
  control: 'span',
};

const toneClassMap: Record<TypographyTone, string | null> = {
  default: null,
  muted: s.toneMuted,
  accent: s.toneAccent,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
};

const alignClassMap: Record<TypographyAlign, string> = {
  left: s.alignLeft,
  center: s.alignCenter,
  right: s.alignRight,
};

export function Typography<T extends ElementType = 'p'>({
  as,
  variant = 'body',
  tone = 'default',
  align = 'left',
  truncate = false,
  readingWidth = false,
  className,
  ...props
}: TypographyProps<T>) {
  const Component = (as || defaultTagMap[variant]) as ElementType;
  const classes = [
    s.root,
    variantClassMap[variant],
    toneClassMap[tone],
    alignClassMap[align],
    truncate && s.truncate,
    readingWidth && s.readingWidth,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Component className={classes} {...props} />;
}
