// Run through Playwright MCP with isolated Vite on port 5178.
async page => {
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => route.fulfill({ status: 401, json: {} }));
  const results = [];
  for (const theme of ['light', 'dark']) {
    await page.goto('http://127.0.0.1:5178/login');
    await page.evaluate(value => localStorage.setItem('averon-admin-theme', value), theme);
    await page.reload();
    const eye = page.locator('button[aria-pressed]');
    await eye.waitFor();
    const check = async state => {
      const data = await eye.evaluate(el => {
        const fg = getComputedStyle(el.querySelector('svg')).color;
        let node = el, bg;
        while (node) { const value = getComputedStyle(node).backgroundColor; if (!value.endsWith(', 0)') && value !== 'transparent') { bg = value; break; } node = node.parentElement; }
        const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
        const lum = value => { const c = rgb(value); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
        const a = lum(fg), b = lum(bg); return { fg, bg, ratio: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) };
      });
      results.push({theme,state,...data});
      if (data.ratio < 3) throw new Error(JSON.stringify(results));
    };
    await check('normal');
    await eye.hover();
    await check('hover');
    await eye.focus();
    await check('focus');
  }
  return results;
}
