import { describe, expect, it } from 'vitest';
import { isLocalAdminHost, resolveAdminApiOrigin, resolveAdminBrowserApiUrl } from './apiOrigin';

describe('resolveAdminApiOrigin', () => {
  it('requires HTTPS for production and strips trailing slashes', () => {
    expect(() => resolveAdminApiOrigin('http://api.example.test', false, 'https://fallback.test')).toThrow('Production API origin must use HTTPS');
    expect(resolveAdminApiOrigin('https://api.example.test/v1/', false, 'https://fallback.test')).toBe('https://api.example.test/v1');
  });

  it('allows local HTTP and uses the fallback when unset', () => {
    expect(resolveAdminApiOrigin('http://127.0.0.1:8080', true, 'https://fallback.test')).toBe('http://127.0.0.1:8080');
    expect(resolveAdminApiOrigin('', false, 'https://fallback.test')).toBe('https://fallback.test');
  });

  it.each(['not-a-url', 'https://user:pass@api.example.test', 'https://api.example.test?token=secret', 'https://api.example.test#fragment'])('rejects malformed or credential-bearing origins: %s', (value) => {
    expect(() => resolveAdminApiOrigin(value, false, 'https://fallback.test')).toThrow();
  });

  it.each(['localhost', '127.0.0.1', '::1', '[::1]'])('uses loopback API for local production previews: %s', (hostname) => {
    expect(isLocalAdminHost(hostname)).toBe(true);
    expect(resolveAdminBrowserApiUrl(hostname, 'http://127.0.0.1:8080', 'https://api.example.test'))
      .toBe('http://127.0.0.1:8080');
  });

  it('uses the configured HTTPS API for non-local hosts', () => {
    expect(resolveAdminBrowserApiUrl('admin.averon.uz', 'http://127.0.0.1:8080', 'https://api.example.test'))
      .toBe('https://api.example.test');
  });
});
