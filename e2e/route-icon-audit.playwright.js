// Run through Playwright MCP against an isolated Vite server at 127.0.0.1:5178.
// Navigate to /login?auditGroup=N before each run, for N=1..4; groups avoid tool timeouts.
// Covers normal and disabled-normal states, then hover and keyboard-generated focus for enabled icon-only buttons.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const groups = [
    ['/', '/login', '/products/new', '/products/edit/fixture', '/products', '/categories', '/imports'],
    ['/orders', '/reviews', '/finance', '/commerce/promo-codes', '/media', '/users', '/users/icon-fixture'],
    ['/audit-log', '/visual-search/audit', '/notifications', '/analytics', '/error-logs', '/profile'],
    ['/settings', '/settings/general', '/settings/staff', '/system/health', '/system/integrations', '/not-found-audit'],
  ];
  const group = Number(new URL(page.url()).searchParams.get('auditGroup'));
  if (!Number.isInteger(group) || group < 1 || group > groups.length) throw new Error('Navigate to /login?auditGroup=N (N=1..4) before running this audit');
  const routes = groups[group - 1];
  const fixtureUser = { id: 'icon-fixture', name: 'Fixture User', email: 'fixture@example.invalid', phone: '', role: 'USER', adminRole: null, verified: true, isBlocked: false, blockedAt: null, blockedReason: null, createdAt: '2026-01-01T00:00:00Z', avatar: null };
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture-admin', name: 'Fixture Admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN' } });
    if (path.endsWith('/admin/users/icon-fixture')) return route.fulfill({ json: fixtureUser });
    if (path.endsWith('/admin/users')) return route.fulfill({ json: { items: [fixtureUser], total: 1, page: 1, limit: 20, totalPages: 1, meta: { total: 1, totalPages: 1 } } });
    if (path.endsWith('/admin/users/icon-fixture/sessions')) return route.fulfill({ json: [] });
    if (path.endsWith('/media')) return route.fulfill({ json: { items: [], meta: { total: 0, page: 1, limit: 24, totalPages: 1, totalBytes: 0 } } });
    return route.fulfill({ status: 503, json: { error: 'isolated audit fixture: data unavailable' } });
  });

  const parse = text => {
    const s = text.trim();
    let m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (m) { const v = m[1].split(/[,/\s]+/).filter(Boolean).map(Number); return [v[0]/255,v[1]/255,v[2]/255,v[3] ?? 1]; }
    m = s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
    if (m) return [+m[1],+m[2],+m[3],m[4] === undefined ? 1 : +m[4]];
    if (s === 'transparent') return [0,0,0,0];
    throw new Error(`Unsupported CSS color ${s}`);
  };
  const over=(f,b)=>{const a=f[3]+b[3]*(1-f[3]);if(!a)return[0,0,0,0];return[0,1,2].map(i=>(f[i]*f[3]+b[i]*b[3]*(1-f[3]))/a).concat(a)};
  const lum=c=>{const f=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const summary={routes:0,visibleButtons:0,iconOnlyButtons:0,measured:0,stateMeasurements:{normal:0,disabledNormal:0,hover:0,keyboardFocus:0},unknown:[],unverifiedStates:[],failures:[],perRoute:[]};
  for (const theme of ['light','dark']) for (const path of routes) {
    await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
    await page.evaluate(value=>{localStorage.setItem('averon-admin-theme',value);localStorage.setItem('i18nextLng','en')}, theme);
    await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
    try { await page.locator('#root > *').first().waitFor({ state: 'attached', timeout: 5000 }); }
    catch { summary.unknown.push({theme,path,reasons:['app root never mounted']}); }
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150);
    const state=await page.evaluate(()=>{
      const visible=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none');
      const buttons=[...document.querySelectorAll('button')].filter(visible);
      const iconButtons=buttons.filter(b=>{
        if(!b.querySelector('svg')) return false;
        const range=document.createRange(); range.selectNodeContents(b);
        return !([...range.getClientRects()].length>0&&range.toString().trim().length>0);
      });
      return {visibleButtons:buttons.length,iconButtons:iconButtons.map((b,index)=>{
        b.setAttribute('data-route-icon-audit-key',String(index));
        const svg=b.querySelector('svg'); const parts=[...svg.querySelectorAll('path,line,circle,rect,polyline,polygon')];
        const g=parts.find(x=>{const s=getComputedStyle(x);return s.stroke!=='none'||s.fill!=='none'})||svg;
        const gs=getComputedStyle(g),ss=getComputedStyle(svg);const paint=gs.stroke!=='none'?gs.stroke:gs.fill!=='none'?gs.fill:ss.color;
        let bg=[0,0,0,0],unknown=[];
        const chain=[];for(let n=b;n&&n instanceof Element;n=n.parentElement)chain.push(n);
        for(const n of chain.reverse()){const s=getComputedStyle(n);if(s.backgroundImage!=='none')unknown.push(`background-image:${n.tagName.toLowerCase()}`);const c=s.backgroundColor;if(c){let col;try{col=(c==='transparent')?[0,0,0,0]:c.startsWith('color(srgb')?(()=>{const m=c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null})():(()=>{const m=c.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const v=m[1].split(/[,/\s]+/).filter(Boolean).map(Number);return[v[0]/255,v[1]/255,v[2]/255,v[3]??1]})();}catch{} if(!col)unknown.push(`color:${c}`);else bg=col[3]===0?bg:[col[0]*col[3]+bg[0]*(1-col[3]),col[1]*col[3]+bg[1]*(1-col[3]),col[2]*col[3]+bg[2]*(1-col[3]),1];}}
        const opacity=chain.reduce((v,n)=>v*Number(getComputedStyle(n).opacity),1)*Number(gs.opacity);
        return {key:String(index),buttonIndex:buttons.indexOf(b),label:b.getAttribute('aria-label')||b.title||'',paint,bg,opacity,disabled:b.disabled,unknown:[...new Set(unknown)]};
      })};
    });
    summary.routes++;
    summary.visibleButtons+=state.visibleButtons;
    summary.iconOnlyButtons+=state.iconButtons.length;
    const routeRow={theme,path,visibleButtons:state.visibleButtons,iconButtons:state.iconButtons.length,measured:0,hoverMeasured:0,focusMeasured:0,unknown:0,unverifiedStates:[]};
    for(let i=0;i<state.iconButtons.length;i++){
      const b=state.iconButtons[i];
      if(b.unknown.length){routeRow.unknown++;summary.unknown.push({theme,path,label:b.label,reasons:b.unknown});continue;}
      const button=page.locator(`[data-route-icon-audit-key="${b.key}"]`);
      const measureCurrent=async stateName=>{
        try{
          const data=await button.evaluate(el=>{
            const svg=el.querySelector('svg'); if(!svg) throw new Error('SVG disappeared during interaction');
            const parts=[...svg.querySelectorAll('path,line,circle,rect,polyline,polygon')];
            const g=parts.find(x=>{const s=getComputedStyle(x);return s.stroke!=='none'||s.fill!=='none'})||svg;
            const gs=getComputedStyle(g),ss=getComputedStyle(svg);const paint=gs.stroke!=='none'?gs.stroke:gs.fill!=='none'?gs.fill:ss.color;
            let bg=[0,0,0,0],unknown=[];const chain=[];for(let n=el;n&&n instanceof Element;n=n.parentElement)chain.push(n);
            for(const n of chain.reverse()){const s=getComputedStyle(n);if(s.backgroundImage!=='none')unknown.push(`background-image:${n.tagName.toLowerCase()}`);const c=s.backgroundColor;if(c){let col;try{col=c==='transparent'?[0,0,0,0]:c.startsWith('color(srgb')?(()=>{const m=c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null})():(()=>{const m=c.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const v=m[1].split(/[,/\s]+/).filter(Boolean).map(Number);return[v[0]/255,v[1]/255,v[2]/255,v[3]??1]})();}catch{}if(!col)unknown.push(`color:${c}`);else bg=col[3]===0?bg:[col[0]*col[3]+bg[0]*(1-col[3]),col[1]*col[3]+bg[1]*(1-col[3]),col[2]*col[3]+bg[2]*(1-col[3]),1];}}
            const opacity=chain.reduce((v,n)=>v*Number(getComputedStyle(n).opacity),1)*Number(gs.opacity);
            return {paint,bg,opacity,disabled:el.disabled,unknown:[...new Set(unknown)]};
          }, undefined, { timeout: 1500 });
          if(data.unknown.length) throw new Error(data.unknown.join(','));
          const fg=parse(data.paint);fg[3]*=data.opacity;const ratio=contrast(over(fg,data.bg),data.bg);
          if(stateName==='hover'){routeRow.hoverMeasured++;summary.stateMeasurements.hover++;}
          if(stateName==='keyboard-focus'){routeRow.focusMeasured++;summary.stateMeasurements.keyboardFocus++;}
          if(stateName==='normal'){
            routeRow.measured++;summary.stateMeasurements.normal++;
            if(data.disabled) summary.stateMeasurements.disabledNormal++;
          }
          const record={theme,path,label:b.label,state:stateName,disabled:data.disabled,ratio:Number(ratio.toFixed(3))};
          if(ratio<3)summary.failures.push(record);
        }catch(error){routeRow.unverifiedStates.push({label:b.label,state:stateName,reason:String(error)});}
      };
      await measureCurrent('normal');summary.measured++;
      if(!b.disabled){
        try{
          await button.hover({timeout:1500});await page.waitForTimeout(250);await measureCurrent('hover');
          await page.mouse.move(0,0);
          await button.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
          const keyboardFocused=await button.evaluate(el=>document.activeElement===el&&el.matches(':focus-visible'), undefined, { timeout: 1500 });
          if(keyboardFocused){await measureCurrent('keyboard-focus');}
          else routeRow.unverifiedStates.push({label:b.label,state:'keyboard-focus',reason:'Tab navigation did not restore focus-visible to target after DOM update'});
        }catch(error){routeRow.unverifiedStates.push({label:b.label,state:'hover/focus',reason:String(error)});}
      }
    }
    summary.unverifiedStates.push(...routeRow.unverifiedStates.map(item=>({theme,path,...item})));
    summary.perRoute.push(routeRow);
  }
  if(summary.routes!==routes.length*2) throw new Error(`Route coverage incomplete: ${summary.routes}/${routes.length*2}`);
  if(summary.visibleButtons===0||summary.measured===0) throw new Error(`Invalid zero coverage: ${JSON.stringify({routes:summary.routes,visibleButtons:summary.visibleButtons,iconOnlyButtons:summary.iconOnlyButtons,measured:summary.measured,unknown:summary.unknown.slice(0,10),perRoute:summary.perRoute.slice(0,4)})}`);
  return summary;
}
