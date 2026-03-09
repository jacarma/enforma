import type { ElementType } from 'react';
import type { ResolvedOutputProps } from 'enforma';

export function Output({ value, as: Tag }: ResolvedOutputProps) {
  const El = Tag as ElementType;
  const text =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
      ? String(value)
      : '';
  return <El>{text}</El>;
}
