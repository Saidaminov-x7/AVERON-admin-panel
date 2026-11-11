// Run via Playwright MCP against isolated local Vite on port 5178.
// All API requests are answered locally with fixtures; no mutation route is forwarded.
async page => {
  await page.unrouteAll({ behavior: 'wait' });
  const user = { id: 'icon-fixture', name: 'Icon Fixture', email: 'icon@example.invalid', phone: '', role: 'USER', adminRole: null, verified: true, isBlocked: false, blockedAt: null, blockedReason: null, createdAt: '2026-01-01T00:00:00Z', avatar: null };
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture-token' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture-admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Fixture Admin' } });
    if (path.endsWith('/admin/users')) return route.fulfill({ json: { items: [user], total: 21, page: 1, limit: 20, totalPages: 2, meta: { total: 21, totalPages: 2 } } });
    if (path.endsWith('/admin/users/icon-fixture')) return route.fulfill({ json: user });
    if (path.endsWith('/admin/users/icon-fixture/sessions')) return route.fulfill({ json: [] });
    return route.fulfill({ status: 503, json: { error: 'isolated icon contrast fixture' } });
  });
  const results = [];
  const skipped = [];
  const parse = text => {
    const s = text.trim();
    let m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (m) { const a = m[1].split(/[,/\s]+/).filter(Boolean).map(Number); return [a[0]/255,a[1]/255,a[2]/255,a[3] ?? 1]; }
    m = s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
    if (m) return [Number(m[1]),Number(m[2]),Number(m[3]),m[4] === undefined ? 1 : Number(m[4])];
    throw new Error(`Unsupported computed color: ${s}`);
  };
  const composite = (fg,bg) => { const a=fg[3]+bg[3]*(1-fg[3]); if (!a) return [0,0,0,0]; return [(fg[0]*fg[3]+bg[0]*bg[3]*(1-fg[3]))/a,(fg[1]*fg[3]+bg[1]*bg[3]*(1-fg[3]))/a,(fg[2]*fg[3]+bg[2]*bg[3]*(1-fg[3]))/a,a]; };
  const luminance = c => { const f=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4; return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]); };
  const ratio = (a,b) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
  const measure = async (locator, name, theme, state) => {
    const data = await locator.evaluate(el => {
      const icon=el.querySelector('svg'); if (!icon) throw new Error('No SVG icon');
      const iconStyle=getComputedStyle(icon);
      const graphic=[...icon.querySelectorAll('path,line,circle,rect,polyline,polygon')].find(g=>getComputedStyle(g).stroke!=='none'||getComputedStyle(g).fill!=='none')||icon;
      const graphicStyle=getComputedStyle(graphic);
      const paint=graphicStyle.stroke!=='none'?graphicStyle.stroke:graphicStyle.fill!=='none'?graphicStyle.fill:iconStyle.color;
      const chain=[]; for(let n=el;n&&n instanceof Element;n=n.parentElement) chain.push(n);
      let bg=[0,0,0,0]; for(const n of chain.reverse()){const c=getComputedStyle(n).backgroundColor; if(c) {const m=c.match(/^rgba?\(/)||c.startsWith('color(srgb'); if(m) { const x=c.match(/^rgba?\(/)?(()=>{const q=c.match(/^rgba?\(([^)]+)\)$/);const v=q[1].split(/[,/\s]+/).filter(Boolean).map(Number);return[v[0]/255,v[1]/255,v[2]/255,v[3]??1]})():(()=>{const q=c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);return[+q[1],+q[2],+q[3],q[4]===undefined?1:+q[4]]})(); bg=(x[3]===0)?bg:[(x[0]*x[3]+bg[0]*(1-x[3])),(x[1]*x[3]+bg[1]*(1-x[3])),(x[2]*x[3]+bg[2]*(1-x[3])),1]; }} }
      const opacity=chain.reduce((v,n)=>v*Number(getComputedStyle(n).opacity),1)*Number(graphicStyle.opacity);
      return {paint,bg,opacity,disabled:el.disabled,tag:el.tagName,label:el.getAttribute('aria-label')||el.getAttribute('title')||el.innerText?.trim()||''};
    });
    const fgRaw=parse(data.paint), bg=data.bg; fgRaw[3]*=data.opacity;
    const fg=composite(fgRaw,bg), measured=ratio(fg,bg);
    const row={theme,name,state,fg:data.paint,bg:data.bg,opacity:data.opacity,disabled:data.disabled,ratio:Number(measured.toFixed(3))}; results.push(row);
    if (measured<3) throw new Error(`Icon contrast below 3:1: ${JSON.stringify(row)}`);
    return row;
  };
  for (const theme of ['light','dark']) {
    await page.setViewportSize({width:1440,height:950});
    await page.goto('http://127.0.0.1:5178/login');
    await page.evaluate(value=>{localStorage.setItem('averon-admin-theme',value);localStorage.setItem('i18nextLng','en');},theme); await page.reload();
    const eye=page.locator('button[aria-pressed]'); await eye.waitFor();
    await measure(eye,'login-password-eye',theme,'normal'); await eye.hover(); await page.waitForTimeout(250); await measure(eye,'login-password-eye',theme,'hover'); await eye.focus(); await measure(eye,'login-password-eye',theme,'focus');
    const themeButton=page.locator('[data-action-id="admin.theme.toggle"]'); await themeButton.waitFor();
    await measure(themeButton,'theme-toggle',theme,'normal'); await themeButton.hover(); await page.waitForTimeout(250); await measure(themeButton,'theme-toggle',theme,'hover'); await themeButton.focus(); await measure(themeButton,'theme-toggle',theme,'focus');

    await page.goto('http://127.0.0.1:5178/users'); await page.evaluate(value=>localStorage.setItem('averon-admin-theme',value),theme); await page.reload(); await page.getByText('Icon Fixture').waitFor();
    const collapse=page.locator('[data-action-id="admin.sidebar.toggle-collapse"]:visible');
    if(await collapse.count()) { await measure(collapse,'sidebar-collapse',theme,'normal'); await collapse.hover(); await page.waitForTimeout(250); await measure(collapse,'sidebar-collapse',theme,'hover'); await collapse.focus(); await measure(collapse,'sidebar-collapse',theme,'focus'); } else skipped.push(`${theme}: sidebar collapse unavailable`);
    const logout=page.locator('[data-action-id="admin.sidebar.logout"],button.admin-logout');
    if(await logout.count()) { await measure(logout,'logout',theme,'normal'); await logout.hover(); await page.waitForTimeout(250); await measure(logout,'logout',theme,'hover'); await logout.focus(); await measure(logout,'logout',theme,'focus'); } else skipped.push(`${theme}: logout unavailable`);
    const first=page.getByRole('button',{name:/first page/i});
    if(await first.count()) await measure(first,'pagination-first-disabled',theme,'disabled'); else skipped.push(`${theme}: first-page button unavailable`);
    const next=page.getByRole('button',{name:/next page/i});
    if(await next.count()) { await measure(next,'pagination-next',theme,'normal'); await next.hover(); await page.waitForTimeout(250); await measure(next,'pagination-next',theme,'hover'); await next.focus(); await measure(next,'pagination-next',theme,'focus'); } else skipped.push(`${theme}: pagination next unavailable`);

    const block=page.getByRole('button',{name:/block/i}).last();
    if(await block.count()) { await block.click(); const dialog=page.getByRole('dialog').last(); await dialog.waitFor(); const close=dialog.locator('button[aria-label]').first(); await measure(close,'modal-close',theme,'normal'); await close.hover(); await page.waitForTimeout(250); await measure(close,'modal-close',theme,'hover'); await close.focus(); await measure(close,'modal-close',theme,'focus'); await page.keyboard.press('Escape'); } else skipped.push(`${theme}: safe modal trigger unavailable`);
  }
  return { passed: results.length, results, skipped };
}
