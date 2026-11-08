import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accepts any CSS max-width value. The shared page width is 1440px. */
  maxWidth?: string;
  /** Keep spacing controlled by an existing page shell when set to false. */
  padded?: boolean;
  as?: 'div' | 'main' | 'section';
}

export function Container({ as: Component = 'div', className, style, maxWidth = '1440px', padded = true, ...props }: ContainerProps) {
  return React.createElement(Component, {
    className: twMerge('mx-auto w-full', padded && 'px-4 sm:px-6 lg:px-8', className),
    style: { ...style, maxWidth: style?.maxWidth ?? maxWidth },
    ...props,
  });
}
