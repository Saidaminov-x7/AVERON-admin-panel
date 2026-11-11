// Run via Playwright MCP against isolated Vite on port 5178.
async page => {
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/api/backend/**', route => route.fulfill({status:401,json:{}}));
  const results=[];
  for (const locale of ['ru','uz','en']) for (const width of [375,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto('http://127.0.0.1:5178/login');
    await page.evaluate(value=>localStorage.setItem('i18nextLng',value),locale);
    await page.reload();
    await page.locator('h1:visible').first().waitFor();
    const result=await page.evaluate(async()=>{
      const body=getComputedStyle(document.body).fontFamily;
      const heading=getComputedStyle(document.querySelector('h1')).fontFamily;
      const loaded=await Promise.all(['400','500','600','650','700'].map(weight=>document.fonts.load(`${weight} 16px Inter`, 'AVERON Русский Oʻzbek')));
      return {body,heading,faces:loaded.map(faces=>faces.length)};
    });
    if (!result.body.includes('Inter') || !result.heading.includes('Inter') || result.faces.some(count=>count===0)) throw new Error(`Inter did not load: ${JSON.stringify({locale,width,...result})}`);
    results.push({locale,width,...result});
  }
  return {passed:results.length,results};
}
