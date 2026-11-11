// Navigate to the local Vite server (5178) or production preview (4173), then run via Playwright MCP.
async page => {
  const origin = new URL(page.url()).origin;
  if (!['http://127.0.0.1:5178','http://127.0.0.1:4173'].includes(origin)) throw new Error('Open the local Vite server or preview first');
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/api/backend/**', route => route.fulfill({status:401,json:{}}));
  const requests=[];
  const observe=request=>{ if (request.resourceType()==='font' || /fonts\.(googleapis|gstatic)\.com/i.test(request.url())) requests.push(request.url()); };
  page.on('request',observe);
  const results=[];
  for (const locale of ['ru','uz','en']) for (const width of [375,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(`${origin}/login`);
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
  page.off('request',observe);
  const external=requests.filter(url=>new URL(url).origin!==origin);
  if (external.length || !requests.some(url=>url.includes('/fonts/inter/'))) throw new Error(`Unexpected font requests: ${JSON.stringify(requests)}`);
  return {passed:results.length,localFontRequests:requests.length,results};
}
