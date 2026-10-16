const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const assert=require('node:assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'datatour-bf26-config.json'),'utf8')).priority_hotels;
(async()=>{
 const server=http.createServer((req,res)=>{
  const target=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(req.url.split('?')[0]==='/datatour-bf26-preview.html'){
   const cfg=JSON.parse(fs.readFileSync(path.join(root,'datatour-bf26-config.json'),'utf8'));delete cfg.recipient;cfg.ajaxUrl='/wp-admin/admin-ajax.php';
   for(const key of ['reviews','payments','priority_hotels','datatour_choice_hotels','scenario_images','winter_destinations'])for(const item of cfg[key]||[])if(item.image&&!item.image.startsWith('http'))item.image='/assets/'+item.image;
   let body=fs.readFileSync(path.join(root,'datatour-bf26.html'),'utf8').replaceAll('{{asset_url}}','/assets').replaceAll('{{ajax_url}}',cfg.ajaxUrl);
   cfg.news.forEach((item,i)=>body=body.replaceAll('{{news_'+(i+1)+'_url}}',item.url));
   res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}'+fs.readFileSync(path.join(root,'datatour-bf26.css'),'utf8')+'</style><body>'+body+'<script>window.DatatourBF26='+JSON.stringify(cfg).replaceAll('</','<\\/')+';</script><script>'+fs.readFileSync(path.join(root,'datatour-bf26.js'),'utf8')+'</script></body></html>');return;
  }
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html; charset=utf-8','.webp':'image/webp','.js':'application/javascript','.css':'text/css'};
  res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
 let tests=0;const passed=label=>{tests++;console.log('PASS '+label);};
 try{
  for(const [width,deviceScaleFactor,candidate] of [[1024,1,'desktop-1280'],[1440,1,'desktop-1920'],[1440,2,'desktop-1920'],[390,1,'mobile-480'],[390,2,'mobile-768']]){
   const check=await browser.newContext({viewport:{width,height:900},deviceScaleFactor});
   await check.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   const tab=await check.newPage(),requests=[];tab.on('request',r=>{if(r.url().includes('/hero-ocean/'))requests.push(r.url());});
   await tab.goto(origin+'/datatour-bf26-preview.html',{waitUntil:'networkidle'});
   const image=tab.locator('.dt-hero-photo img');await image.evaluate(el=>el.decode());
   assert.equal(requests.length,1);assert.ok(requests[0].endsWith(candidate+'.webp'));assert.ok((await image.evaluate(el=>el.currentSrc)).endsWith(candidate+'.webp'));
   assert.ok(fs.statSync(path.join(root,'assets/hero-ocean',candidate+'.webp')).size<150000);
   assert.equal(await image.getAttribute('fetchpriority'),'high');assert.equal(await image.getAttribute('loading'),'eager');
   const hero=await tab.locator('.dt-hero').boundingBox(),background=await tab.locator('.dt-hero-photo').boundingBox();
   for(const key of ['x','y','width','height'])assert.ok(Math.abs(hero[key]-background[key])<1);
   assert.ok(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await check.close();
  }
  passed('Ocean hero: exactly one responsive WebP request at desktop/mobile DPR1/2, each under150KB, high priority and full-bleed without layout overflow');
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage(),errors=[],posts=[],events=[];let rejectStorage=true,tourvisorLoads=0,mapLoads=0;
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/wp-admin/admin-ajax.php**',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{success:true,data:{nonce:'contract-nonce',issued:Math.floor(Date.now()/1000)-4,token:'contract-token'}}});
   posts.push(route.request().postData());
   return route.fulfill({status:rejectStorage?503:200,json:rejectStorage?{success:false,data:{code:'storage_failed',message:'Не удалось сохранить заявку. Попробуйте ещё раз.'}}:{success:true,data:{message:'Спасибо! Заявка принята.',deliveryStatus:'saved_in_wordpress',storageStatus:'saved',emailStatus:'failed'}}});
  });
  await context.route(/^https?:\/\/tourvisor\.ru\/module\/init\.js$/,async route=>{tourvisorLoads++;await route.fulfill({contentType:'application/javascript',body:'document.querySelector("#dt-tourvisor-container .tv-search-form").innerHTML="<label>Lifecycle fixture<input type=search></label><button>Search fixture</button>";'});});
  await context.route('https://yandex.by/map-widget/**',route=>{mapLoads++;return route.fulfill({contentType:'text/html',body:'Map lifecycle fixture'});});
  // Layout fixture only: the executor cannot reach the external photo CDN.
  await context.route(/^https:\/\/static\.tourvisor\.ru\/hotel_pics\/main400\/\d+\.jpg$/,route=>route.fulfill({contentType:'image/jpeg',body:fs.readFileSync(path.join(root,'assets/hotels/lonicera-world-resort.jpg'))}));
  await page.goto(origin+'/datatour-bf26-preview.html',{waitUntil:'networkidle'});
  await page.locator('#dt-cookie-banner').evaluate(el=>el.hidden=true);
  for(const [width,height] of [[1366,768],[1440,900]]){
   await page.setViewportSize({width,height});
   const fit=await page.locator('.dt-hero').evaluate(el=>({bottom:el.getBoundingClientRect().bottom,overflow:getComputedStyle(el).overflow}));
   assert.ok(fit.bottom<=height,'Hero including header must fit '+JSON.stringify({width,height,...fit}));assert.notEqual(fit.overflow,'hidden');
   await page.screenshot({path:'/workspace/scratch/bf26-refresh/brief-hero-'+width+'.png'});
  }
  await page.locator('#dt-cookie-banner').evaluate(el=>el.hidden=false);
  await page.setViewportSize({width:1440,height:900});
  assert.equal(await page.locator('.dt-hero-copy .dt-row a').count(),2);assert.equal(await page.locator('#dt-quick-form [type=submit]').textContent(),'Подобрать тур');
  assert.equal(await page.locator('[data-form-context]').count(),0);assert.equal(await page.locator('#dt-quick-form input[name=contact]').getAttribute('type'),'tel');
  assert.equal(await page.locator('#dt-quick-form h2').textContent(),'Подготовим варианты');
  assert.equal(await page.locator('#dt-early-choice .dt-advance-item').count(),4);assert.equal(await page.locator('details.dt-priority').count(),0);
  assert.equal(await page.locator('.dt-argument').count(),6);assert.equal(await page.locator('.dt-faq-list details').count(),7);
  assert.equal(await page.locator('[data-scenario-set=summer] .dt-scenario-photo img').count(),5);
  for(const photo of await page.locator('[data-scenario-set=summer] .dt-scenario-photo img').all()){await photo.scrollIntoViewIfNeeded();await photo.evaluate(el=>el.decode());assert.ok(await photo.evaluate(el=>el.naturalWidth>0));}
  assert.equal(await page.locator('.dt-process-start .dt-step-bottom').count(),0);assert.equal(await page.locator('.dt-process-end .dt-row a').count(),2);
  assert.equal(await page.locator('.dt-post-media img').count(),3);passed('Short hero fits 1366×768 and 1440×900; five restored scenario photographs, four early-choice situations, open list, six arguments and seven FAQ');
  assert.equal(await page.locator('[data-block]').count(),15);assert.equal(await page.locator('#dt-hotels .dt-hotel-card').count(),26);assert.equal(await page.locator('[data-select-priority]').count(),26);passed('15 blocks including customer favourites; original catalogue retains all 26 cards and priority positions');
  const choice=JSON.parse(fs.readFileSync(path.join(root,'datatour-bf26-config.json'),'utf8')).datatour_choice_hotels;
  assert.equal(choice.length,25);
  assert.deepEqual(choice.filter(h=>h.priceStatus==='priced').map(h=>[h.name,h.priceAmount]),[['ROYAL GARDEN BEACH',6938],['BIENO CLUB HOTEL SVS',5610],['BLUE FISH HOTEL',6165],['EOS BEACH RESORT',6379],['ORFEUS PARK HOTEL',6265],['LABRANDA ALANTUR HOTEL',6838],['NIRVANA MEDITERRANEAN EXCELLENCE',11219]]);
  assert.deepEqual(choice.map(h=>Number(h.image.match(/(\d+)\.jpg$/)[1])),[27646,15905,1463,1062,1568,1051,1094,3456,1123,1017,1033,1319,1102,1457,1331,3435,2222,1361,1483,1046,1250,28327,9358,37527,1090]);
  const choiceOrder=[...choice.filter(h=>h.priceStatus==='priced'),...choice.filter(h=>h.priceStatus==='pending')].map(h=>h.id);
  assert.deepEqual(await page.locator('#dt-choice-track > article').evaluateAll(els=>els.map(el=>el.dataset.hotel)),choiceOrder);
  assert.equal(await page.locator('#dt-choice .dt-choice-card').count(),25);assert.equal(await page.locator('#dt-choice [data-price-status=priced].dt-hotel-card').count(),7);
  assert.equal(await page.locator('#dt-choice .dt-hotel-price-basis').count(),7);
  assert.ok((await page.locator('#dt-choice .dt-hotel-price-basis').allTextContents()).every(s=>s==='за двоих'));
  assert.equal(await page.locator('#dt-choice [data-price-status=pending].dt-hotel-card').count(),18);
  for(const h of choice){const card=page.locator('#dt-choice [data-hotel="'+h.id+'"]');assert.equal(await card.locator('img').getAttribute('src'),h.image);assert.equal(await card.locator('img').getAttribute('loading'),'lazy');assert.equal(await card.locator('.dt-hotel-offer-link').getAttribute('href'),'https://datatour.by/?tvsearch=nuaei1');assert.ok((await card.locator('.dt-hotel-description').textContent()).startsWith('Кому подойдёт:'));}
  assert.equal(new Set(await page.locator('#dt-choice .dt-hotel-description').allTextContents()).size,25);
  assert.equal(await page.locator('#dt-choice [data-hotel=choice-5] .dt-hotel-category').textContent(),'HV1');assert.equal(await page.locator('#dt-choice [data-hotel=choice-17] .dt-hotel-category').count(),0);
  assert.equal(await page.locator('#dt-choice .dt-eyebrow').textContent(),'07 / ВЫБОР ДАТА ТУР');
  assert.equal(await page.locator('#dt-choice-title').textContent(),'ТОП 25 ОТЕЛЕЙ ТУРЦИИ 2026, которые покупали клиенты');
  assert.ok(await page.locator('#dt-choice').evaluate(el=>el.previousElementSibling.id==='dt-steps'&&el.nextElementSibling.id==='dt-search'));
  passed('Customer favourites: exactly 25 XLSX hotels, 7 prices per couple first in source order, 18 pending, supplied photos/links and distinct recommendations');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [1440,1024,768,390,360]){
   await page.setViewportSize({width,height:900});await page.locator('#dt-choice').scrollIntoViewIfNeeded();
   await page.locator('#dt-choice-track').evaluate(el=>el.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(80);
   const measures=await page.locator('#dt-choice-track').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,card:el.firstElementChild.getBoundingClientRect().width}));
   assert.ok(measures.scroll>measures.width&&measures.card>200&&measures.card<=measures.width);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#dt-choice-next').click();await page.waitForFunction(()=>document.querySelector('#dt-choice-track').scrollLeft>100);
   await page.locator('#dt-choice-track').focus();await page.keyboard.press('ArrowRight');
   await page.waitForFunction(()=>!document.querySelector('#dt-choice-prev').disabled);
   assert.equal(await page.locator('#dt-choice-prev').isEnabled(),true);
   await page.locator('#dt-choice-track').evaluate(el=>el.scrollTo({left:el.scrollWidth,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('#dt-choice-next').disabled);
   assert.ok((await page.locator('#dt-choice-counter').textContent()).includes('25'));
   assert.deepEqual(await page.locator('#dt-choice-track > article').evaluateAll(els=>els.map(el=>el.dataset.hotel)),choiceOrder);
   await page.locator('#dt-choice-track').evaluate(el=>el.scrollTo({left:0,behavior:'instant'}));
   await page.screenshot({path:'/workspace/scratch/bf26-refresh/customer-choice-'+width+'-photo-fixture.png'});
  }
  await page.setViewportSize({width:1440,height:900});
  for(const id of ['choice-2','choice-5','choice-1','choice-25']){
   await page.locator('#dt-tab-winter').click();await page.locator('[data-winter-country=egypt]').click();
   await page.locator('[data-select-hotel="'+id+'"]').click();
   for(const form of ['#dt-final-form','#dt-quick-form']){assert.equal(await page.locator(form+' input[name=hotelId]').inputValue(),id);assert.equal(await page.locator(form+' input[name=hotelLabel]').inputValue(),choice.find(h=>h.id===id).name);assert.equal(await page.locator(form+' [name=season]').inputValue(),'summer');assert.equal(await page.locator(form+' [name=direction]').inputValue(),'');assert.equal(await page.locator(form+' [name=source]').inputValue(),'datatour-choice');}
  }
  assert.equal(await page.locator('#dt-choice .dt-hotel-card:not([hidden])').count(),25);
  await page.locator('#dt-final-form [data-remove-hotel]').click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  passed('Independent favourites slider: responsive 4/3/2/1-card layout, arrows/keyboard/counter/end state, and cross-season hotel transfer to both forms');
  assert.equal(await page.locator('[data-budget],#dt-results').count(),0);assert.equal(await page.locator('#dt-hotel-footer > span').count(),0);
  const descriptions=await page.locator('#dt-hotels .dt-hotel-description').allTextContents();assert.equal(descriptions.length,26);assert.equal(new Set(descriptions).size,26);assert.ok(descriptions.every(text=>text.length>=90&&!text.includes('Цена и наличие')));
  assert.ok((await page.locator('[data-select-hotel]').allTextContents()).every(text=>text==='Подобрать этот отель'));assert.equal(await page.locator('#dt-hotels .dt-hotel-offer-link').count(),26);
  assert.equal(await page.locator('#dt-hotels .dt-hotel-card[data-price-status=priced]').count(),19);assert.equal(await page.locator('#dt-hotels .dt-hotel-card[data-price-status=pending]').count(),7);
  for(const h of catalogue){
   const card=page.locator('[data-hotel="'+h.id+'"]');
   assert.equal(await card.locator('img').getAttribute('src'),h.image);assert.equal(await card.locator('.dt-hotel-offer-link').getAttribute('href'),h.selectionUrl);
   assert.equal(await card.locator('.dt-hotel-category').textContent(),h.category+'*');
   const text=await card.locator('.dt-hotel-price').textContent();
   if(h.priceStatus==='priced'){assert.ok(text.replace(/\s/g,'').includes(String(h.priceAmount)+'BYN'));assert.ok(text.includes('1/2 DBL'));}
   else assert.equal(text,'Цена на просчёте');
  }
  assert.equal(await page.locator('[data-hotel="priority-12"] img').getAttribute('src'),'https://static.tourvisor.ru/hotel_pics/main400/15869.jpg');
  assert.equal(await page.locator('#dt-hotels-title').textContent(),'Рекомендованные отели Турции');
  assert.equal(await page.locator('#dt-hotels .dt-eyebrow').textContent(),'04 / ТОП отелей для раннего бронирования');
  assert.equal(await page.locator('.dt-filter-bar').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
  assert.ok((await page.locator('.dt-hotel-price-notes').textContent()).includes('стоимость на 1 взрослого в двуместном номере'));
  assert.ok((await page.locator('.dt-hotel-offer-note').textContent()).includes('Такие цены бывают один раз в году.'));
  for(const [width,n] of [[1440,4],[1024,3],[768,2],[390,1]]){
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);
   const ordered=await page.locator('#dt-hotels .dt-hotel-card:not([hidden])').evaluateAll(els=>els.map(el=>({id:el.dataset.hotel,price:Number(el.dataset.price),status:el.dataset.priceStatus})));
   const priced=ordered.filter(h=>h.status==='priced');assert.deepEqual(priced.map(h=>h.price),priced.map(h=>h.price).sort((a,b)=>a-b));
   assert.deepEqual(ordered.slice(0,n).map(h=>h.id),priced.slice(0,n).map(h=>h.id));assert.ok(ordered.slice(n,n+7).every(h=>h.status==='pending'));
   await page.locator('#dt-hotel-next').click();await page.waitForTimeout(650);
   const first=await page.locator('#dt-hotel-track').evaluate(el=>{const left=el.getBoundingClientRect().left;return Array.from(el.children).find(c=>!c.hidden&&c.getBoundingClientRect().right>left+5)?.dataset.priceStatus;});assert.equal(first,'pending');
   for(const scenario of ['family','couple','friends','discover','service']){
    await page.locator('#dt-hotel-scenario').selectOption(scenario);await page.waitForTimeout(100);
    const ids=await page.locator('#dt-hotels .dt-hotel-card:not([hidden])').evaluateAll(els=>els.map(el=>el.dataset.hotel));
    assert.deepEqual([...ids].sort(),catalogue.filter(h=>h.scenarios.includes(scenario)).map(h=>h.id).sort());
    assert.ok(await page.locator('#dt-hotel-track').evaluate(el=>el.scrollLeft<=5));
   }
   await page.locator('#dt-hotel-scenario').selectOption('all');
   await page.locator('#dt-hotels').scrollIntoViewIfNeeded();await page.screenshot({path:'/workspace/scratch/bf26-refresh/catalogue-image-fixture-'+width+'.png'});
  }
  await page.setViewportSize({width:1440,height:900});
  for(const id of ['priority-1','priority-21','priority-25','priority-26']){await page.locator('[data-select-hotel="'+id+'"]').click();assert.equal(await page.locator('#dt-final-form input[name=hotelId]').inputValue(),id);}
  passed('26 XLSX photos/prices/offer links, corrected AKRA photo, all scenario filters, first-page cheapest and second-page pending at four breakpoints (photo layout fixture)');
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
  assert.deepEqual(await page.locator('#dt-hotel-season option').evaluateAll(els=>els.map(el=>el.value)),['summer']);
  await page.locator('#dt-tab-winter').click();assert.equal(await page.locator('#dt-panel-winter').isVisible(),true);
  assert.equal(await page.locator('[data-winter-country]').count(),6);assert.equal(await page.locator('#dt-panel-winter [data-scenario]').count(),0);
  assert.equal(new Set(await page.locator('.dt-winter-country-media img').evaluateAll(els=>els.map(el=>el.src))).size,6);
  const countries=[['egypt','Египет','Шарм-эль-Шейх'],['uae','ОАЭ','Дубай, Шарджа, Аджман, Рас-эль-Хайма, Фуджейра'],['thailand','Таиланд','Пхукет, Као Лак, Паттайя; Краби — для комбинированных поездок'],['vietnam','Вьетнам','Фукуок'],['sri-lanka','Шри-Ланка','Южное и юго-западное побережье'],['china','Китай','Хайнань: Санья и курортные бухты']];
  for(const [id,name,resorts] of countries){
   const card=page.locator('[data-winter-country="'+id+'"]');assert.equal(await card.locator('.dt-winter-country-name').textContent(),name);assert.equal(await card.locator('.dt-winter-country-resorts').textContent(),resorts);
   const image=card.locator('.dt-winter-country-media img');await image.scrollIntoViewIfNeeded();await image.evaluate(el=>el.decode());assert.equal(await image.evaluate(el=>el.naturalWidth),1536);assert.equal(await image.getAttribute('loading'),'lazy');assert.ok((await image.getAttribute('alt')).startsWith('Иллюстрация'));
   await card.click();assert.equal(await card.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-winter-country][aria-pressed=true]').count(),1);
   for(const form of ['#dt-final-form','#dt-quick-form']){assert.equal(await page.locator(form+' [name=direction]').inputValue(),name+' · '+resorts);assert.equal(await page.locator(form+' [name=season]').inputValue(),'winter');assert.equal(await page.locator(form+' [name=hotelId]').inputValue(),'');assert.equal(await page.locator(form+' [name=purpose]').inputValue(),'selection');}
  }
  assert.equal(await page.locator('#dt-hotel-track').isVisible(),true);assert.equal(await page.locator('#dt-hotel-season').inputValue(),'summer');assert.equal(await page.locator('.dt-hotel-price-notes').isVisible(),true);
  await page.locator('#dt-final-form [name=direction]').fill('Мои пожелания');assert.equal(await page.locator('[data-winter-country][aria-pressed=true]').count(),0);assert.equal(await page.locator('#dt-quick-form [name=direction]').inputValue(),'Мои пожелания');
  await page.locator('[data-winter-country=egypt]').click();await page.locator('[data-winter-country=egypt]').click();assert.equal(await page.locator('#dt-final-form [name=direction]').inputValue(),'');
  await page.locator('[data-winter-country=vietnam]').click();await page.locator('#dt-reset-scenario').click();assert.equal(await page.locator('[data-winter-country][aria-pressed=true]').count(),0);assert.equal(await page.locator('#dt-final-form [name=direction]').inputValue(),'');
  for(const [width,columns] of [[1440,3],[768,2],[390,1],[360,1]]){
   await page.setViewportSize({width,height:1000});
   const layout=await page.locator('.dt-winter-countries').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(layout,columns);
   const gap=await page.locator('.dt-tabs').evaluate(el=>el.getBoundingClientRect().top-el.previousElementSibling.getBoundingClientRect().bottom);assert.ok(gap>=20&&gap<=25);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#dt-cookie-banner').evaluate(el=>el.hidden=true);await page.locator('#dt-choose').screenshot({path:'/workspace/scratch/bf26-refresh/winter-countries-'+width+'.png'});
  }
  await page.setViewportSize({width:1440,height:900});await page.locator('[data-winter-country=china]').click();await page.locator('#dt-tab-summer').click();assert.equal(await page.locator('#dt-final-form [name=direction]').inputValue(),'');assert.equal(await page.locator('#dt-panel-summer').isVisible(),true);
  await page.locator('#dt-tab-summer').focus();await page.keyboard.press('End');assert.equal(await page.locator('#dt-panel-winter').isVisible(),true);await page.keyboard.press('Home');assert.equal(await page.locator('#dt-panel-summer').isVisible(),true);
  passed('Six winter countries/resorts, form transfer and clearing, keyboard tabs, 20–24px spacing and 3/2/1-column layout; Turkey catalogue remains summer-only');
  await page.locator('[data-scenario-set=summer] [data-scenario=family]').click();
  assert.equal(await page.locator('details.dt-priority').count(),0);await page.locator('[data-select-priority=priority-26]').click();
  assert.equal(await page.locator('#dt-final-form input[name=hotelLabel]').inputValue(),'IC HOTELS');assert.equal(await page.locator('#dt-quick-form input[name=hotelId]').inputValue(),'priority-26');
  assert.equal(await page.locator('#dt-final-form input[name=scenario]').inputValue(),'family');assert.equal(await page.locator('#dt-final-form input[name=budgetLevel]').inputValue(),'all');passed('Season, scenario, IC HOTELS and parameter transfer without a budget filter');
  await page.locator('#dt-final-form button[type=submit]').click();assert.equal(posts.length,0);assert.equal(await page.locator('#dt-final-form input[name=contact]').getAttribute('aria-invalid'),'true');
  await page.locator('#dt-final-form input[name=contact]').fill('test@example.com');await page.locator('#dt-final-form input[name=consent]').check();
  await page.locator('#dt-final-form select[name=children]').selectOption('1');await page.locator('#dt-final-form button[type=submit]').click();assert.equal(posts.length,0);
  await page.locator('#dt-final-form input[name=ages]').fill('-1');await page.locator('#dt-final-form button[type=submit]').click();assert.equal(posts.length,0);
  await page.locator('#dt-final-form input[name=ages]').fill('14');
  await page.locator('#dt-final-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('dt-final-message').dataset.state==='error');assert.equal(posts.length,1);assert.equal(await page.locator('#dt-final-message').getAttribute('data-state'),'error');passed('Client consent/ages validation and server error never shown as success');
  rejectStorage=false;
  await page.locator('#dt-final-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('dt-final-message').dataset.state==='success');assert.equal(posts.length,2);
  await page.locator('#dt-final-form button[type=submit]').click();assert.equal(posts.length,2);passed('Success only after handler acceptance; repeated submit does not send again');
  await page.locator('#dt-quick-form input[name=contact]').fill('test@example.com');await page.locator('#dt-quick-form input[name=consent]').check();
  await page.locator('#dt-quick-form button[type=submit]').click();assert.equal(posts.length,2);
  await page.locator('#dt-quick-form input[name=contact]').fill('+375291234567');await page.locator('#dt-quick-form input[name=email]').fill('invalid');
  await page.locator('#dt-quick-form button[type=submit]').click();assert.equal(posts.length,2);assert.equal(await page.locator('#dt-quick-form input[name=email]').getAttribute('aria-invalid'),'true');
  await page.locator('#dt-quick-form input[name=email]').fill('traveller@example.com');await page.locator('#dt-quick-form input[name=name]').fill('Турист');
  await page.locator('#dt-quick-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('dt-quick-message').dataset.state==='success');assert.equal(posts.length,3);
  for(const value of ['name="scenario"','family','priority-26','traveller@example.com','Турист'])assert.ok(posts[2].includes(value));
  passed('Quick form requires a phone, validates optional email and preserves name, selected hotel and scenario in mocked submission');
  const tracked=await page.evaluate(()=>window.recordedEvents);assert.ok(!JSON.stringify(tracked).includes('test@example.com'));assert.equal(tracked.filter(e=>e.action==='hotel').length,1);assert.equal(tracked.filter(e=>e.action==='form_accepted').length,2);passed('Event payload has no contact and does not duplicate hotel/acceptance events');
  assert.equal(tourvisorLoads,1);assert.equal(await page.locator('#dt-tourvisor-container .tv-search-form input').isVisible(),true);
  assert.equal(await page.locator('script[src="//tourvisor.ru/module/init.js"]').count(),1);assert.equal(await page.locator('#dt-load-tourvisor').count(),0);
  assert.equal(await page.locator('#dt-map-frame iframe').count(),1);assert.equal(mapLoads,1);
  assert.equal(await page.locator('#dt-map-frame iframe').getAttribute('loading'),'eager');assert.equal(await page.locator('#dt-load-map').count(),0);
  assert.equal(await page.locator('footer#dt-contacts').count(),1);assert.equal(await page.locator('section.dt-contacts').count(),0);
  assert.equal(await page.locator('.dt-footer-support a[href^="mailto:"]').count(),2);assert.equal(await page.locator('.dt-footer-company a[href^="tel:"]').count(),3);
  assert.equal(await page.locator('.dt-footer-socials a').count(),3);assert.equal(await page.locator('.dt-footer-bottom .dt-footer-links a').count(),2);assert.equal(await page.locator('footer [data-cookie-settings],footer a[href="#dt-terms"]').count(),0);
  await page.locator('#dt-cookie-banner').evaluate(el=>el.hidden=false);
  await page.locator('[data-cookie-settings]').first().click();assert.equal(await page.locator('#dt-cookie-dialog').isVisible(),true);
  await page.locator('#dt-cookie-close').click();await page.locator('[data-cookie-choice=necessary]').click();await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#dt-cookie-banner').isVisible(),false);assert.equal(tourvisorLoads,2);assert.equal(mapLoads,2);
  assert.equal(await page.locator('#dt-tourvisor-container .tv-search-form input').isVisible(),true);assert.equal(await page.locator('#dt-map-frame iframe').count(),1);
  passed('Merged footer retains contacts/policies/socials; eager map autoloads without a launch button or consent; cookie choice persists (vendor fixtures)');
  // Reproduce the legacy theme's universal typography rule, including nested spans.
  await page.addStyleTag({content:'*{font-family:Georgia,serif;font-size:18px;line-height:100%}'});
  for(const width of [360,390,768,920,1024,1366,1440]){
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
  }passed('360/390/768/920/1024/1366/1440: aligned header with equal font sizes, single-line address, no overflow and readable descriptions');
  await page.evaluate(()=>{Date.now=()=>new Date('2026-11-27T00:00:00+03:00').getTime();});await page.waitForFunction(()=>document.getElementById('dt-campaign-status').textContent==='Акция идёт');
  await page.evaluate(()=>{Date.now=()=>new Date('2026-11-29T23:59:59+03:00').getTime();});await page.waitForTimeout(1100);assert.equal(await page.locator('#dt-campaign-status').textContent(),'Акция идёт');
  await page.evaluate(()=>{Date.now=()=>new Date('2026-11-30T00:00:00+03:00').getTime();});await page.waitForFunction(()=>document.getElementById('dt-campaign-status').textContent==='Акция завершена');
  assert.equal(await page.locator('[data-goal=booking]').count(),0);assert.ok((await page.locator('[data-active-offers],[data-campaign-copy]').evaluateAll(els=>els.every(el=>el.hidden))));assert.ok(!(await page.locator('#dt-h1').textContent()).includes('распродажи'));assert.ok(!(await page.locator('#dt-request-title').textContent()).includes('распродаже'));
  assert.ok((await page.locator('[data-time]').allTextContents()).every(v=>v==='00'));passed('Confirmed Minsk boundaries, automatic ending, no negative timer or expired booking CTA');
  assert.deepEqual(errors,[]);passed('No JavaScript errors in the component');
  const render=await context.newPage();await render.goto(origin+'/datatour-bf26-preview.html',{waitUntil:'networkidle'});await render.locator('[data-cookie-choice=necessary]').evaluate(el=>el.click());
  for(const width of [1440,390]){await render.setViewportSize({width,height:1000});await render.screenshot({path:'/workspace/scratch/bf26-refresh/preview-'+width+'.png',fullPage:false});}
  await page.setViewportSize({width:1440,height:1000});await page.locator('footer#dt-contacts').screenshot({path:'/workspace/scratch/bf26-refresh/footer-1440.png'});await page.setViewportSize({width:390,height:1000});await page.locator('footer#dt-contacts').screenshot({path:'/workspace/scratch/bf26-refresh/footer-390.png'});
  console.log('COMPLETED '+tests+' frontend contracts. Mail and vendor lifecycle are mocked here; production delivery/vendor behavior require separate live checks.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
