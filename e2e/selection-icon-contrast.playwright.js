// Run through Playwright MCP against isolated local Vite on port 5178.
// Measures checked/unchecked selection icon strokes against their composited rendered backgrounds.
async page => {
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Fixture Admin' } });
    if (path.endsWith('/admin/users')) return route.fulfill({ json: { items: [{ id: 'fixture-user', name: 'Fixture User', email: 'user@example.invalid', phone: '', role: 'USER', isBlocked: false, createdAt: '2026-01-01T00:00:00Z', avatar: null }], total: 1, page: 1, limit: 15, totalPages: 1 } });
    if (path.endsWith('/media')) return route.fulfill({ json: { items: [{ id: 'fixture-media', url: 'https://assets.example.invalid/fixture.png', ownerId: 'fixture', mimeType: 'image/png', size: 128, width: 1, height: 1, hash: 'fixture', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }], meta: { total: 1, page: 1, limit: 24, totalPages: 1, totalBytes: 128 } } });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });

  const measure = async button => button.evaluate(el => {
    const parse = value => {
      const match = value.match(/[\d.]+/g);
      if (!match) return [0, 0, 0, 1];
      const scale = value.startsWith('color(srgb ') ? 255 : 1;
      return [Number(match[0]) * scale, Number(match[1]) * scale, Number(match[2]) * scale, match[3] === undefined ? 1 : Number(match[3])];
    };
    const over = (front, back) => {
      const a = front[3] + back[3] * (1 - front[3]);
      if (a === 0) return [0, 0, 0, 0];
      return [0,1,2].map(i => (front[i] * front[3] + back[i] * back[3] * (1-front[3])) / a).concat(a);
    };
    const linear = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
    const luminance = c => .2126*linear(c[0]) + .7152*linear(c[1]) + .0722*linear(c[2]);
    const svg = el.querySelector('svg');
    if (!svg) throw new Error('Selection control has no SVG icon');
    const glyph = svg.querySelector('[stroke]:not([stroke="none"]),[fill]:not([fill="none"])') || svg;
    const glyphStyle = getComputedStyle(glyph);
    let foreground = parse(glyphStyle.stroke && glyphStyle.stroke !== 'none' ? glyphStyle.stroke : glyphStyle.fill && glyphStyle.fill !== 'none' ? glyphStyle.fill : glyphStyle.color);
    let ancestors = [], node = el;
    while (node && node !== document.documentElement) { ancestors.push(node); node = node.parentElement; }
    const rootColor = document.documentElement.classList.contains('dark') ? [17,19,21,1] : [255,255,255,1];
    let background = rootColor;
    for (const layer of ancestors.reverse()) {
      const style = getComputedStyle(layer), color = parse(style.backgroundColor);
      background = over(color, background);
    }
    const opacity = Number(getComputedStyle(el).opacity);
    foreground[3] *= opacity;
    background = over([background[0],background[1],background[2],1], rootColor);
    const visibleForeground = over(foreground, background);
    const a = luminance(visibleForeground), b = luminance(background);
    return { iconColor: glyphStyle.stroke && glyphStyle.stroke !== 'none' ? glyphStyle.stroke : glyphStyle.fill, background: `rgb(${background.slice(0,3).map(Math.round).join(',')})`, ratio: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) };
  });

  const results = [];
  for (const theme of ['light', 'dark']) {
    for (const [route, selector, name] of [
      ['/users', 'button[aria-label="Select user Fixture User"]', 'user selection'],
      ['/media', 'button[aria-label="Select file fixture-media"]', 'media selection'],
    ]) {
      await page.goto(`http://127.0.0.1:5178${route}`);
      await page.evaluate(value => localStorage.setItem('averon-admin-theme', value), theme);
      await page.reload();
      const button = page.locator(selector);
      await button.waitFor();
      for (const checked of [false, true]) {
        if ((await button.getAttribute('aria-pressed')) === String(!checked)) await button.click();
        await page.mouse.move(0, 0);
        await page.waitForTimeout(250);
        for (const state of ['normal', 'hover', 'focus']) {
          if (state === 'hover') await button.hover();
          if (state === 'focus') await button.focus();
          if (state !== 'normal') await page.waitForTimeout(200);
          const colors = await measure(button);
          const result = { theme, route, control: name, checked, state, ...colors };
          results.push(result);
          if (colors.ratio < 3) throw new Error(`Contrast below 3:1: ${JSON.stringify(result)}`);
        }
      }
    }
  }
  return { passed: results.length, results };
}
