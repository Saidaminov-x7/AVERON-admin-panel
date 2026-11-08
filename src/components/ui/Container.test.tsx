import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Container } from './Container';

describe('Container', () => {
  it('uses the shared 1440px max-width and responsive padding by default', () => {
    const markup = renderToStaticMarkup(createElement(Container, null, 'Page content'));
    expect(markup).toContain('max-width:1440px');
    expect(markup).toContain('px-4 sm:px-6 lg:px-8');
    expect(markup).toContain('Page content');
  });

  it('allows deliberate width and lets explicit inline style take precedence', () => {
    const markup = renderToStaticMarkup(createElement(Container, { as: 'main', maxWidth: '64rem', style: { maxWidth: '50rem' } }));
    expect(markup).toContain('max-width:50rem');
    expect(markup).toContain('<main');
  });
});
