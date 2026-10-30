import { describe, expect, it } from 'vitest';
import { updateUserQueryParams } from './userQueryParams';

describe('updateUserQueryParams', () => {
  it('applies the selected filter and page reset atomically while preserving other filters', () => {
    const next = updateUserQueryParams(
      new URLSearchParams('search=coat&sort=createdAt-desc&page=4'),
      { role: 'USER', page: 1 },
    );

    expect(next.toString()).toBe('search=coat&sort=createdAt-desc&page=1&role=USER');
  });

  it('removes cleared filters without dropping the remaining query state', () => {
    const next = updateUserQueryParams(
      new URLSearchParams('search=coat&role=USER&page=3'),
      { role: '', page: 1 },
    );

    expect(next.toString()).toBe('search=coat&page=1');
  });
});
