// Run through Playwright MCP against the isolated Vite server on 127.0.0.1:5178.
async page => {
  const copy = { en: 'Delete / archive', ru: 'Удалить / архивировать', uz: 'O‘chirish / arxivlash' };
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'PATCH' && path.endsWith('/promo-codes/fixture-promo')) { await new Promise(resolve => setTimeout(resolve, 1500)); return route.fulfill({ json: {} }); }
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Fixture Admin' } });
    if (path.endsWith('/api/v1/admin/commerce/promo-codes')) return route.fulfill({ json: [{ id: 'fixture-promo', code: 'FIXTURE', discountPercent: 5, maxActivations: 10, usedActivations: 1, remainingActivations: 9, isActive: true, startsAt: null, expiresAt: null, createdAt: '2026-01-01T00:00:00Z', status: 'ACTIVE' }] });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });
  const results = [];
  const parse = value => {
    let match = value.match(/^rgba?\(([^)]+)\)$/);
    if (match) { const c = match[1].split(/[,/\s]+/).filter(Boolean).map(Number); return [c[0]/255,c[1]/255,c[2]/255,c[3] ?? 1]; }
    match = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
    if (match) return [+match[1],+match[2],+match[3],match[4] === undefined ? 1 : +match[4]];
    throw new Error(`Unsupported color: ${value}`);
  };
  const composite = (front, back) => { const a = front[3] + back[3] * (1-front[3]); return [0,1,2].map(i => (front[i]*front[3]+back[i]*back[3]*(1-front[3]))/a).concat(a); };
  const luminance = color => { const linear = v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4; return .2126*linear(color[0]) + .7152*linear(color[1]) + .0722*linear(color[2]); };
  for (const theme of ['light','dark']) for (const locale of ['ru','uz','en']) for (const width of [375,1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:5178/commerce/promo-codes');
    await page.evaluate(({theme,locale}) => { localStorage.setItem('averon-admin-theme',theme); localStorage.setItem('i18nextLng',locale); }, {theme,locale});
    await page.reload();
    const button = page.getByRole('button', { name: `${copy[locale]}: FIXTURE` });
    await button.waitFor();
    for (const state of ['normal','hover','keyboard-focus','disabled']) {
      if (state === 'hover') { await button.hover({ timeout: 1500 }); await page.waitForTimeout(250); }
      if (state === 'keyboard-focus') { await page.mouse.move(0,0); await button.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); }
      if (state === 'disabled') { await page.locator('tr:has-text("FIXTURE") button:has(svg.lucide-save)').click(); await page.waitForFunction(el => el.disabled, await button.elementHandle(), {timeout: 1000}); }
      const measured = await button.evaluate(el => {
        const svg = el.querySelector('svg');
        const path = svg?.querySelector('path');
        const foreground = getComputedStyle(path || svg).stroke !== 'none' ? getComputedStyle(path || svg).stroke : getComputedStyle(path || svg).fill !== 'none' ? getComputedStyle(path || svg).fill : getComputedStyle(svg).color;
        let bg = [0,0,0,0];
        for (const node of [...(function*(){for(let n=el;n&&n instanceof Element;n=n.parentElement)yield n;})()].reverse()) {
          const value=getComputedStyle(node).backgroundColor;
          if(value==='transparent') continue;
          const m=value.match(/^rgba?\(([^)]+)\)$/)||value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
          if(!m) continue;
          let c;
          if(value.startsWith('color(srgb')) c=[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]];
          else {const v=m[1].split(/[,/\s]+/).filter(Boolean).map(Number);c=[v[0]/255,v[1]/255,v[2]/255,v[3]??1];}
          bg = c[3]===1 ? c : [c[0]*c[3]+bg[0]*(1-c[3]),c[1]*c[3]+bg[1]*(1-c[3]),c[2]*c[3]+bg[2]*(1-c[3]),1];
        }
        return {foreground,background:bg,disabled:el.disabled,opacity:Number(getComputedStyle(el).opacity)};
      });
      const fg=parse(measured.foreground); fg[3]*=measured.opacity;
      const visible=composite(fg,measured.background), a=luminance(visible),b=luminance(measured.background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const result={theme,locale,width,state,foreground:measured.foreground,background:measured.background,disabled:measured.disabled,ratio:Number(ratio.toFixed(3))};
      results.push(result);
      if(ratio<3) throw new Error(`Contrast below 3:1 ${JSON.stringify(result)}`);
    }
  }
  return {passed:results.length,minimum:Math.min(...results.map(r=>r.ratio)),results};
}
