const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const assert=require('node:assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  const target=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html; charset=utf-8','.webp':'image/webp','.js':'application/javascript','.css':'text/css'};
  res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
 let tests=0;const passed=label=>{tests++;console.log('PASS '+label);};
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage(),errors=[],posts=[],events=[];let rejectMail=true,tourvisorLoads=0,mapLoads=0;
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/wp-admin/admin-ajax.php**',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{success:true,data:{nonce:'contract-nonce',issued:Math.floor(Date.now()/1000)-4,token:'contract-token'}}});
   posts.push(route.request().postData());
   return route.fulfill({status:rejectMail?503:200,json:rejectMail?{success:false,data:{code:'mail_failed',message:'Не удалось отправить заявку. Попробуйте ещё раз.'}}:{success:true,data:{message:'Спасибо! Заявка принята.',deliveryStatus:'accepted_by_wp_mail'}}});
  });
  await context.route(/^https?:\/\/tourvisor\.ru\/module\/init\.js$/,async route=>{tourvisorLoads++;await route.fulfill({contentType:'application/javascript',body:'document.querySelector("#dt-tourvisor-container .tv-search-form").innerHTML="<label>Lifecycle fixture<input type=search></label><button>Search fixture</button>";'});});
  await context.route('https://yandex.by/map-widget/**',route=>{mapLoads++;return route.fulfill({contentType:'text/html',body:'Map lifecycle fixture'});});
  await page.goto(origin+'/datatour-bf26-preview.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-block]').count(),14);assert.equal(await page.locator('.dt-hotel-card').count(),25);assert.equal(await page.locator('[data-select-priority]').count(),26);passed('14 blocks after footer merge, 25 cards, all 26 priority positions');
  assert.equal(await page.locator('#dt-trust').isVisible(),true);assert.equal(await page.locator('#dt-trust-title').textContent(),'Доверие к ДАТА ТУР');
  assert.equal(await page.locator('.dt-review-caption').count(),0);assert.equal(await page.locator('[data-review][aria-label]').count(),4);
  assert.equal((await page.locator('.dt-review-links').textContent()).trim(),'Больше отзывов в Яндекс и Гугл');
  assert.equal(await page.locator('.dt-review-links a').first().getAttribute('href'),'https://yandex.by/maps/-/CXBuAN1i');assert.equal(await page.locator('.dt-review-links a').last().getAttribute('href'),'https://maps.app.goo.gl/EM7heMBFGo85mfiw7');
  for(const button of await page.locator('[data-review]').all()){
   await button.click();assert.equal(await page.locator('#dt-viewer').isVisible(),true);await page.waitForFunction(()=>{const img=document.querySelector('#dt-viewer-content img');return img&&img.complete&&img.naturalWidth>0;});
   const viewport=await page.locator('#dt-viewer').boundingBox();assert.ok(viewport.y>=0&&viewport.y+viewport.height<=900);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#dt-viewer').isVisible(),false);assert.equal(await button.evaluate(el=>el===document.activeElement),true);
  }
  passed('Four supplied reviews and map links; each screenshot enlarges, fits viewport and restores focus on Escape');
  assert.equal(await page.locator('[data-lead-form] input[name=consent]:checked').count(),0);
  assert.equal(await page.locator('.dt-header').evaluate(el=>getComputedStyle(el).position),'sticky');
  const logoBox=await page.locator('.dt-header .dt-logo').boundingBox(),navBox=await page.locator('#dt-navigation').boundingBox();
  assert.ok(Math.abs(logoBox.x+logoBox.width/2-720)<2);assert.ok(navBox.y>logoBox.y+logoBox.height);
  assert.equal(await page.locator('.dt-header-slogan').textContent(),'Вы нам дату — мы вам варианты отдыха к Чёрной пятнице.');
  for(const link of await page.locator('.dt-socials a').all()){assert.ok(await link.getAttribute('aria-label'));assert.equal((await link.textContent()).trim(),'');assert.equal(await link.locator('svg[aria-hidden=true]').count(),1);}
  assert.equal(await page.locator('.dt-header .dt-address [data-dt-icon=map-pin] svg').count(),1);
  const summary=page.locator('.dt-phones summary');await summary.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.dt-phones[open]').count(),1);
  const labelBox=await summary.locator('span').boundingBox(),arrowBox=await summary.locator('.dt-phone-chevron').boundingBox();assert.ok(arrowBox.x-labelBox.x-labelBox.width<=10);assert.ok(Math.abs(arrowBox.y+arrowBox.height/2-labelBox.y-labelBox.height/2)<2);
  await page.waitForTimeout(250);assert.equal(await summary.locator('svg').evaluate(el=>getComputedStyle(el).transform),'matrix(-1, 0, 0, -1, 0, 0)');
  await page.locator('.dt-header-slogan').click();assert.equal(await page.locator('.dt-phones[open]').count(),0);
  await summary.click();await page.keyboard.press('Escape');assert.equal(await page.locator('.dt-phones[open]').count(),0);assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
  passed('Centred logo and separate navigation; accessible social icons, geo icon and attached rotating phone chevron');
  assert.equal(await page.locator('.dt-phone-list a[href^="tel:"]').count(),4);passed('Sticky header, telephone links, keyboard/Escape and initially unchecked consent');
  await page.evaluate(()=>{window.recordedEvents=[];document.getElementById('dt-bf26').addEventListener('dtbf26:event',e=>window.recordedEvents.push(e.detail));});
  await page.locator('#dt-hotel-season').selectOption('winter');assert.equal(await page.locator('#dt-empty').isVisible(),true);await page.locator('#dt-hotel-season').selectOption('summer');
  await page.locator('[data-scenario-set=summer] [data-scenario=family]').click();
  await page.locator('[data-budget=comfort]').click();
  await page.locator('.dt-priority summary').click();await page.locator('[data-select-priority=priority-26]').click();
  assert.equal(await page.locator('#dt-final-form input[name=hotelLabel]').inputValue(),'IC HOTELS');assert.equal(await page.locator('#dt-quick-form input[name=hotelId]').inputValue(),'priority-26');
  assert.equal(await page.locator('#dt-final-form input[name=scenario]').inputValue(),'family');assert.equal(await page.locator('#dt-final-form input[name=budgetLevel]').inputValue(),'comfort');passed('Season, scenario, budget, IC HOTELS and parameter transfer');
  await page.locator('#dt-final-form button[type=submit]').click();assert.equal(posts.length,0);assert.equal(await page.locator('#dt-final-form input[name=contact]').getAttribute('aria-invalid'),'true');
  await page.locator('#dt-final-form input[name=contact]').fill('test@example.com');await page.locator('#dt-final-form input[name=consent]').check();
  await page.locator('#dt-final-form select[name=children]').selectOption('1');await page.locator('#dt-final-form button[type=submit]').click();assert.equal(posts.length,0);
  await page.locator('#dt-final-form input[name=ages]').fill('-1');await page.locator('#dt-final-form button[type=submit]').click();assert.equal(posts.length,0);
  await page.locator('#dt-final-form input[name=ages]').fill('14');
  await page.locator('#dt-final-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('dt-final-message').dataset.state==='error');assert.equal(posts.length,1);assert.equal(await page.locator('#dt-final-message').getAttribute('data-state'),'error');passed('Client consent/ages validation and server error never shown as success');
  rejectMail=false;
  await page.locator('#dt-final-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('dt-final-message').dataset.state==='success');assert.equal(posts.length,2);
  await page.locator('#dt-final-form button[type=submit]').click();assert.equal(posts.length,2);passed('Success only after handler acceptance; repeated submit does not send again');
  const tracked=await page.evaluate(()=>window.recordedEvents);assert.ok(!JSON.stringify(tracked).includes('test@example.com'));assert.equal(tracked.filter(e=>e.action==='hotel').length,1);assert.equal(tracked.filter(e=>e.action==='form_accepted').length,1);passed('Event payload has no contact and does not duplicate hotel/acceptance events');
  assert.equal(tourvisorLoads,1);assert.equal(await page.locator('#dt-tourvisor-container .tv-search-form input').isVisible(),true);
  assert.equal(await page.locator('script[src="//tourvisor.ru/module/init.js"]').count(),1);assert.equal(await page.locator('#dt-load-tourvisor').count(),0);
  assert.equal(await page.locator('#dt-map-frame iframe').count(),1);assert.equal(mapLoads,1);
  assert.equal(await page.locator('#dt-map-frame iframe').getAttribute('loading'),'eager');assert.equal(await page.locator('#dt-load-map').count(),0);
  assert.equal(await page.locator('footer#dt-contacts').count(),1);assert.equal(await page.locator('section.dt-contacts').count(),0);
  assert.equal(await page.locator('.dt-footer-support a[href^="mailto:"]').count(),2);assert.equal(await page.locator('.dt-footer-company a[href^="tel:"]').count(),3);
  assert.equal(await page.locator('.dt-footer-socials a').count(),3);assert.equal(await page.locator('.dt-footer-bottom .dt-footer-links a').count(),2);assert.equal(await page.locator('footer [data-cookie-settings],footer a[href="#dt-terms"]').count(),0);
  await page.locator('[data-cookie-settings]').first().click();assert.equal(await page.locator('#dt-cookie-dialog').isVisible(),true);
  await page.locator('#dt-cookie-close').click();await page.locator('[data-cookie-choice=necessary]').click();await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#dt-cookie-banner').isVisible(),false);assert.equal(tourvisorLoads,2);assert.equal(mapLoads,2);
  assert.equal(await page.locator('#dt-tourvisor-container .tv-search-form input').isVisible(),true);assert.equal(await page.locator('#dt-map-frame iframe').count(),1);
  passed('Merged footer retains contacts/policies/socials; eager map autoloads without a launch button or consent; cookie choice persists (vendor fixtures)');
  // Reproduce the legacy theme's universal typography rule, including nested spans.
  await page.addStyleTag({content:'*{font-family:Georgia,serif;font-size:18px;line-height:100%}'});
  for(const width of [360,390,768,920,1024,1440]){
   await page.setViewportSize({width,height:900});
   const sizes=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(sizes.scroll<=sizes.width,JSON.stringify({width,...sizes}));
   const typography=await page.evaluate(()=>['.dt-header-slogan','.dt-header-cta','.dt-phones summary span','.dt-header .dt-address span'].map(selector=>{const el=document.querySelector(selector),box=el.getBoundingClientRect();return {font:parseFloat(getComputedStyle(el).fontSize),top:box.y,bottom:box.bottom,center:box.y+box.height/2,height:box.height,line:parseFloat(getComputedStyle(el).lineHeight)};}));
   assert.deepEqual(typography.map(item=>item.font),[13,13,13,13]);
   if(width>900){
    assert.ok(Math.abs(typography[0].center-typography[2].center)<2);
    assert.ok(Math.abs(typography[1].top-typography[2].top)<1,'Button upper edge must match the phone label');
    if(width<1200)assert.ok(typography[1].bottom<=typography[3].top,'Button must not overlap the single-line address');
   }
   if(width>=1200){assert.ok(typography[0].height<=typography[0].line+1,'Desktop slogan must stay on one line');}
   const headerHeight=await page.locator('.dt-header').evaluate(el=>el.getBoundingClientRect().height);assert.ok(headerHeight<=(width<=900?175:140),JSON.stringify({width,headerHeight}));
   const address=await page.locator('.dt-header .dt-address').evaluate(el=>{const icon=el.querySelector('svg').getBoundingClientRect(),text=el.querySelector('span').getBoundingClientRect();return {height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight),iconCenter:icon.y+icon.height/2,textCenter:text.y+text.height/2};});
   assert.ok(address.height<=address.line+3,JSON.stringify({width,address}));assert.ok(Math.abs(address.iconCenter-address.textCenter)<2);
   if(width<=900){
    await page.locator('#dt-review-track').evaluate(el=>el.scrollLeft=0);
    await page.locator('[data-review="0"]').click();assert.equal(await page.locator('#dt-viewer-content img').evaluate(el=>el.getBoundingClientRect().width<=innerWidth-24),true);await page.locator('.dt-dialog-close').click();
    await page.locator('#dt-review-next').click();await page.waitForTimeout(600);assert.ok(await page.locator('#dt-review-track').evaluate(el=>el.scrollLeft>0));
   }
   if(width<=900){
    await page.locator('.dt-menu-button').click();assert.equal(await page.locator('#dt-navigation').isVisible(),true);assert.equal(await page.locator('.dt-menu-button').getAttribute('aria-expanded'),'true');
    await page.locator('#dt-navigation a[href="#dt-contacts"]').click();await page.waitForTimeout(800);
    assert.equal(await page.locator('#dt-navigation').isVisible(),false);assert.equal(await page.locator('.dt-menu-button').getAttribute('aria-expanded'),'false');
    const header=await page.locator('.dt-header').boundingBox(),footer=await page.locator('footer .dt-logo').boundingBox();assert.ok(footer.y>=header.y+header.height-1);
   }
   for(const selector of ['.dt-hero-idea','.dt-intro','.dt-argument p']){
    const style=await page.locator(selector).first().evaluate(el=>({weight:getComputedStyle(el).fontWeight,size:parseFloat(getComputedStyle(el).fontSize)}));assert.equal(style.weight,'400');assert.ok(style.size>=16);
   }
  }passed('360/390/768/920/1024/1440: aligned header with equal font sizes, single-line address, no overflow and readable descriptions');
  await page.evaluate(()=>{Date.now=()=>new Date('2026-11-27T00:00:00+03:00').getTime();});await page.waitForFunction(()=>document.getElementById('dt-campaign-status').textContent==='Акция идёт');
  await page.evaluate(()=>{Date.now=()=>new Date('2026-11-29T23:59:59+03:00').getTime();});await page.waitForTimeout(1100);assert.equal(await page.locator('#dt-campaign-status').textContent(),'Акция идёт');
  await page.evaluate(()=>{Date.now=()=>new Date('2026-11-30T00:00:00+03:00').getTime();});await page.waitForFunction(()=>document.getElementById('dt-campaign-status').textContent==='Акция завершена');
  assert.equal(await page.locator('[data-goal=booking]').count(),0);assert.equal(await page.locator('[data-active-offers]').isVisible(),false);assert.ok(!(await page.locator('#dt-h1').textContent()).includes('распродажи'));assert.ok(!(await page.locator('#dt-request-title').textContent()).includes('распродаже'));
  assert.ok((await page.locator('[data-time]').allTextContents()).every(v=>v==='00'));passed('Confirmed Minsk boundaries, automatic ending, no negative timer or expired booking CTA');
  assert.deepEqual(errors,[]);passed('No JavaScript errors in the component');
  const render=await context.newPage();await render.goto(origin+'/datatour-bf26-preview.html',{waitUntil:'networkidle'});await render.locator('[data-cookie-choice=necessary]').evaluate(el=>el.click());
  for(const width of [1440,390]){await render.setViewportSize({width,height:1000});await render.screenshot({path:'/workspace/scratch/bf26-refresh/preview-'+width+'.png',fullPage:false});}
  await page.setViewportSize({width:1440,height:1000});await page.locator('footer#dt-contacts').screenshot({path:'/workspace/scratch/bf26-refresh/footer-1440.png'});await page.setViewportSize({width:390,height:1000});await page.locator('footer#dt-contacts').screenshot({path:'/workspace/scratch/bf26-refresh/footer-390.png'});
  console.log('COMPLETED '+tests+' frontend contracts. Mail and vendor lifecycle are mocked here; production delivery/vendor behavior require separate live checks.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
