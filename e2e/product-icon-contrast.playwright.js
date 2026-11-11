// Run via Playwright MCP against isolated Vite on port 5178; no mutations reach the API.
async page => {
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'a', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    return route.fulfill({ status: 503, json: {} });
  });
  const results = [];
  const labels = {
    en: { add: 'Add color', remove: 'Remove color', up: 'Move photo up', down: 'Move photo down', removePhoto: 'Remove photo' },
    ru: { add: 'Добавить цвет', remove: 'Удалить цвет', up: 'Переместить фото выше', down: 'Переместить фото ниже', removePhoto: 'Удалить фото' },
    uz: { add: "Rang qo'shish", remove: "rangini o'chirish", up: 'Fotonni yuqoriga ko‘chirish', down: 'Fotonni pastga ko‘chirish', removePhoto: 'Fotonni o‘chirish' },
  };
  for (const theme of ['light', 'dark']) for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:5178/products/new');
    await page.evaluate(({theme,locale}) => { localStorage.setItem('averon-admin-theme', theme); localStorage.setItem('i18nextLng', locale); }, {theme,locale});
    await page.reload();
    const steps = page.locator('main [role="group"]').first().locator('button');
    await steps.nth(2).click();
    await page.getByRole('button', { name: labels[locale].add }).click();
    const color = page.getByRole('button', { name: new RegExp(labels[locale].remove) });
    const measure = async (button, label) => {
      const data = await button.evaluate(el => {
        const fg = getComputedStyle(el.querySelector('svg')).color;
        let node = el, bg;
        while (node) { const s = getComputedStyle(node); if (Number(s.opacity) !== 1) throw new Error(`Unexpected opacity ${s.opacity}`); const value = s.backgroundColor; if (!value.endsWith(', 0)') && value !== 'transparent') { bg = value; break; } node = node.parentElement; }
        const lum = value => { const c = value.match(/[\d.]+/g).slice(0,3).map(Number).map(n => { n /= 255; return n <= .04045 ? n/12.92 : ((n+.055)/1.055)**2.4; }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
        const a=lum(fg), b=lum(bg); return {fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),disabled:el.disabled};
      });
      results.push({theme,locale,width,label,...data});
      if (data.ratio < 3) throw new Error(JSON.stringify(results));
    };
    await measure(color, 'remove-color');
    await color.click();
    if (await color.count()) throw new Error(`Color removal failed: ${locale}/${width}`);
    await steps.nth(3).click();
    const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xx9kAAAAASUVORK5CYII=';
    await page.locator('input[type=file]').setInputFiles(['a','b'].map(name => ({ name: name+'.png', mimeType: 'image/png', buffer: Buffer.from(image,'base64') })));
    const up = page.getByRole('button',{name:labels[locale].up});
    const down = page.getByRole('button',{name:labels[locale].down});
    const removePhoto = page.getByRole('button',{name:labels[locale].removePhoto});
    await measure(removePhoto.first(),'remove-photo');
    for (let i=0;i<2;i++) { await measure(up.nth(i),`up-${i}`); await measure(down.nth(i),`down-${i}`); }
    if (!await up.first().isDisabled() || !await down.last().isDisabled()) throw new Error('Disabled boundary incorrect');
    const images = page.locator('section:has(input[type=file]) ol img');
    const before = await images.evaluateAll(nodes => nodes.map(node => node.src));
    await down.first().click();
    const after = await images.evaluateAll(nodes => nodes.map(node => node.src));
    if (before.length !== 2 || after[0] !== before[1] || after[1] !== before[0]) throw new Error('Photos were not reordered');
    await removePhoto.first().click();
    if (await images.count() !== 1) throw new Error('Photo removal failed');
    if (!await up.first().isDisabled() || !await down.last().isDisabled()) throw new Error('Reorder boundary incorrect');
  }
  return results;
}
