/* Datatour BF2026 — page-scoped production interactions. */
(()=>{'use strict';
function initDatatourBF26(){
const root=document.getElementById('dt-bf26');
if(!root||root.dataset.dtInitialized==='true')return;
root.dataset.dtInitialized='true';
const $=s=>root.querySelector(s),$$=s=>Array.from(root.querySelectorAll(s));
const cfg=window.DatatourBF26||{};
const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dtIconSVG={"baby": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M9 12h.01\" />\n  <path d=\"M15 12h.01\" />\n  <path d=\"M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5\" />\n  <path d=\"M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1\" />\n</svg>", "bed-double": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8\" />\n  <path d=\"M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4\" />\n  <path d=\"M12 4v6\" />\n  <path d=\"M2 18h20\" />\n</svg>", "building-2": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z\" />\n  <path d=\"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2\" />\n  <path d=\"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2\" />\n  <path d=\"M10 6h4\" />\n  <path d=\"M10 10h4\" />\n  <path d=\"M10 14h4\" />\n  <path d=\"M10 18h4\" />\n</svg>", "calendar-check": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M8 2v4\" />\n  <path d=\"M16 2v4\" />\n  <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" />\n  <path d=\"M3 10h18\" />\n  <path d=\"m9 16 2 2 4-4\" />\n</svg>", "calendar-days": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M8 2v4\" />\n  <path d=\"M16 2v4\" />\n  <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" />\n  <path d=\"M3 10h18\" />\n  <path d=\"M8 14h.01\" />\n  <path d=\"M12 14h.01\" />\n  <path d=\"M16 14h.01\" />\n  <path d=\"M8 18h.01\" />\n  <path d=\"M12 18h.01\" />\n  <path d=\"M16 18h.01\" />\n</svg>", "check-check": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M18 6 7 17l-5-5\" />\n  <path d=\"m22 10-7.5 7.5L13 16\" />\n</svg>", "clipboard-check": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" />\n  <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" />\n  <path d=\"m9 14 2 2 4-4\" />\n</svg>", "clipboard-list": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" />\n  <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" />\n  <path d=\"M12 11h4\" />\n  <path d=\"M12 16h4\" />\n  <path d=\"M8 11h.01\" />\n  <path d=\"M8 16h.01\" />\n</svg>", "compass": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\" />\n  <circle cx=\"12\" cy=\"12\" r=\"10\" />\n</svg>", "file-check-2": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4\" />\n  <path d=\"M14 2v4a2 2 0 0 0 2 2h4\" />\n  <path d=\"m3 15 2 2 4-4\" />\n</svg>", "file-pen-line": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2\" />\n  <path d=\"M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\" />\n  <path d=\"M8 18h1\" />\n</svg>", "heart": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\" />\n</svg>", "image-plus": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M16 5h6\" />\n  <path d=\"M19 2v6\" />\n  <path d=\"M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5\" />\n  <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" />\n  <circle cx=\"9\" cy=\"9\" r=\"2\" />\n</svg>", "layout-list": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\" />\n  <rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\" />\n  <path d=\"M14 4h7\" />\n  <path d=\"M14 9h7\" />\n  <path d=\"M14 15h7\" />\n  <path d=\"M14 20h7\" />\n</svg>", "map-pin": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" />\n  <circle cx=\"12\" cy=\"10\" r=\"3\" />\n</svg>", "menu": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" />\n  <line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" />\n  <line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />\n</svg>", "message-square": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\" />\n</svg>", "plane": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z\" />\n</svg>", "receipt": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z\" />\n  <path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\" />\n  <path d=\"M12 17.5v-11\" />\n</svg>", "search": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"11\" cy=\"11\" r=\"8\" />\n  <path d=\"m21 21-4.3-4.3\" />\n</svg>", "search-check": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"m8 11 2 2 4-4\" />\n  <circle cx=\"11\" cy=\"11\" r=\"8\" />\n  <path d=\"m21 21-4.3-4.3\" />\n</svg>", "sliders-horizontal": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\" />\n  <line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\" />\n  <line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\" />\n  <line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\" />\n  <line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\" />\n  <line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\" />\n  <line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\" />\n  <line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\" />\n  <line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\" />\n</svg>", "sparkles": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" />\n  <path d=\"M20 3v4\" />\n  <path d=\"M22 5h-4\" />\n  <path d=\"M4 17v2\" />\n  <path d=\"M5 18H3\" />\n</svg>", "users": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" />\n  <circle cx=\"9\" cy=\"7\" r=\"4\" />\n  <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" />\n  <path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />\n</svg>", "wallet": "<svg class=\"dt-svg-icon\" aria-hidden=\"true\"\n \n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"1.5\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\" />\n  <path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\" />\n</svg>"};
dtIconSVG['arrow-up-right']='<svg class="dt-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const icons=()=>$$('[data-dt-icon]').forEach(el=>{if(dtIconSVG[el.dataset.dtIcon])el.innerHTML=dtIconSVG[el.dataset.dtIcon];});
const scenarios=[{id:'family',name:'С детьми',icon:'baby',summer:'Пляж, удобный номер и отдых в ритме семьи.',winter:'Возраст детей, каникулы и удобный перелёт.'},{id:'couple',name:'Вдвоём и спокойно',icon:'heart',summer:'Море, спокойный ритм и время друг для друга.',winter:'Тёплая пауза и отдых без лишней спешки.'},{id:'friends',name:'Активно и компанией',icon:'users',summer:'Общие планы и удобное размещение для компании.',winter:'Новые впечатления и активная поездка вместе.'},{id:'discover',name:'Море и новые впечатления',icon:'compass',summer:'Пляж, прогулки и поездки за пределы отеля.',winter:'Знакомство с направлением и отдых у моря.'},{id:'service',name:'Высокий уровень сервиса',icon:'sparkles',summer:'Важные детали номера, питания и обслуживания.',winter:'Продуманный отдых и внимание к вашим пожеланиям.'}];
const seasons={summer:'Турция, лето 2027',winter:'Зимние направления'};
const priorities=Array.isArray(cfg.priority_hotels)?cfg.priority_hotels:[];
const hotels=priorities;
let catalogueViewKey='';
const forms=$$('[data-lead-form]');
const winterDestinations=Array.isArray(cfg.winter_destinations)?cfg.winter_destinations:[];
const state={season:'summer',scenario:'all',budget:'all',hotel:null,country:null};
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
function campaignState(now=Date.now()){
 const start=Date.parse(cfg.campaign?.start),end=Date.parse(cfg.campaign?.end);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return {status:'unknown',remaining:0};
 if(now<start)return {status:'before',remaining:start-now};
 if(now<end)return {status:'active',remaining:end-now};
 return {status:'ended',remaining:0};
}
function updateTimer(){
 const t=campaignState();
 const labels={unknown:'Проверим предложения на ваши даты',before:'До начала акции',active:'Акция идёт',ended:'Акция завершена'};
 $('#dt-campaign-status').textContent=labels[t.status];
 const campaignLabel=cfg.campaign?.label||'В дни акции';
 $('.dt-countdown-arrow').toggleAttribute('hidden',t.status!=='before');
 if(t.status!=='ended')$('.dt-hero .dt-eyebrow').textContent='Чёрная пятница · '+campaignLabel;
 const s=Math.max(0,Math.floor(t.remaining/1000));
 const values=[Math.floor(s/86400),Math.floor(s/3600)%24,Math.floor(s/60)%60,s%60];
 ['days','hours','minutes','seconds'].forEach((k,i)=>$('[data-time="'+k+'"]').textContent=String(values[i]).padStart(2,'0'));
 $('.dt-timer').setAttribute('aria-label',labels[t.status]);
 if(t.status==='ended'){
  $$('[data-goal="booking"]').forEach(a=>{a.dataset.goal='selection';if(a.firstChild?.nodeType===3)a.firstChild.textContent='Подобрать актуальный тур';});
  $$('[data-active-offers],[data-campaign-copy]').forEach(el=>el.hidden=true);
  $('#dt-h1').textContent='Подберём отдых на ваши даты';
  $('.dt-hero .dt-eyebrow').textContent='Datatour · Ваш следующий отпуск';
  $('#dt-request-title').textContent='Подготовим варианты для вашего отпуска';
  $('#dt-request .dt-intro').textContent='Укажите пожелания: проверим актуальные цену, наличие и условия для вашей поездки.';
  $$('a[data-goal=selection]').filter(a=>['#dt-request','#dt-quick-form'].includes(a.getAttribute('href'))||a.dataset.source==='search-manager').forEach(a=>{if(a.firstChild?.nodeType===3)a.firstChild.textContent='Подобрать актуальный тур';});
  forms.forEach(f=>{const o=f.elements.purpose.querySelector('option[value="booking"]');if(o)o.disabled=true;if(f.elements.purpose.value==='booking')f.elements.purpose.value='selection';});
  $$('[data-submit-label]').forEach(b=>{if(!b.disabled)b.textContent='Подобрать актуальный тур';});
  const idea=$('.dt-hero-idea');if(idea)idea.textContent='Подготовим актуальные варианты для вашего следующего отпуска.';
 }
}
function updateHeader(){
 const admin=document.getElementById('wpadminbar');
 const offset=admin&&getComputedStyle(admin).position==='fixed'?admin.getBoundingClientRect().height:0;
 root.style.setProperty('--dt-admin-offset',offset+'px');
 root.style.setProperty('--dt-anchor-offset',(offset+$('.dt-header').getBoundingClientRect().height+20)+'px');
}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateHeader).observe($('.dt-header'));
window.addEventListener('resize',updateHeader,{passive:true});updateHeader();
function clearMessages(){forms.forEach(f=>{const box=f.querySelector('.dt-message');box.dataset.show='false';box.textContent='';});}
function message(form,text,kind){const box=form.querySelector('.dt-message');box.textContent=text;box.dataset.state=kind;box.dataset.show='true';}
function childrenChanged(form){if(form.elements.formVariant?.value==='quick')return;const n=Number(form.elements.children.value);const field=form.querySelector('[data-ages-field]');field.hidden=n===0;form.elements.ages.disabled=n===0;form.elements.ages.required=n>0;}
function updateCarousel(kind){
 const track=$('#dt-'+kind+'-track');if(!track)return;
 const cards=Array.from(track.children).filter(c=>!c.hidden),rect=track.getBoundingClientRect();
 const visible=cards.map((c,i)=>({i,r:c.getBoundingClientRect()})).filter(x=>x.r.right>rect.left+5&&x.r.left<rect.right-5);
 const first=visible.length?visible[0].i+1:0,last=visible.length?visible[visible.length-1].i+1:0;
 const counter=$('#dt-'+kind+'-counter');if(counter)counter.textContent=cards.length?(first===last?first:first+'–'+last)+' / '+cards.length:'0 / 0';
 const prev=$('#dt-'+kind+'-prev'),next=$('#dt-'+kind+'-next');
 if(prev)prev.disabled=track.scrollLeft<5;if(next)next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-8||!cards.length;
}
function bindCarousel(kind){const track=$('#dt-'+kind+'-track');if(!track)return;
 for(const [direction,multiplier] of [['prev',-1],['next',1]]){const b=$('#dt-'+kind+'-'+direction);if(b)b.addEventListener('click',()=>track.scrollBy({left:multiplier*(track.clientWidth+18),behavior:motion()}));}
 track.addEventListener('scroll',()=>requestAnimationFrame(()=>updateCarousel(kind)),{passive:true});
 track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();track.scrollBy({left:(e.key==='ArrowRight'?1:-1)*(track.clientWidth+18),behavior:motion()});}});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>updateCarousel(kind)).observe(track);
}
function renderScenarios(){
 const images=Array.isArray(cfg.scenario_images)?cfg.scenario_images:[];
 $$('[data-scenario-set]').forEach(c=>{c.innerHTML=scenarios.map(s=>{const image=images.find(i=>i.id===s.id);return '<button type="button" class="dt-scenario" data-scenario="'+s.id+'" aria-pressed="false">'+(image?'<span class="dt-scenario-photo"><img src="'+escapeHTML(image.image)+'" alt="'+escapeHTML(image.alt)+'" loading="lazy" decoding="async"><span class="dt-scenario-icon"><i data-dt-icon="'+s.icon+'"></i></span></span>':'')+'<span class="dt-scenario-text"><span class="dt-scenario-name">'+s.name+'</span><span class="dt-scenario-hint">'+s[c.dataset.scenarioSet]+'</span><span class="dt-scenario-check">Выбрать сценарий</span></span></button>';}).join('');});
 $('#dt-hotel-scenario').innerHTML='<option value="all">Любой сценарий</option>'+scenarios.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join('');
}
function renderWinterCountries(){
 $('[data-winter-countries]').innerHTML=winterDestinations.map(d=>'<button type="button" class="dt-winter-country" data-winter-country="'+escapeHTML(d.id)+'" aria-pressed="false"><span class="dt-winter-country-media"><img src="'+escapeHTML(d.image)+'" alt="'+escapeHTML(d.imageAlt)+'" width="1536" height="1024" loading="lazy" decoding="async"></span><span class="dt-winter-country-copy"><span class="dt-winter-country-head"><span class="dt-winter-country-icon" aria-hidden="true"><i data-dt-icon="map-pin"></i></span><span class="dt-winter-country-name">'+escapeHTML(d.name)+'</span></span><span class="dt-winter-country-resorts">'+escapeHTML(d.resorts)+'</span><span class="dt-winter-country-select">Выбрать направление</span></span></button>').join('');
}
function winterDirection(country){return country.name+' · '+country.resorts;}
function clearWinterCountry(){
 if(!state.country)return;
 const direction=winterDirection(state.country);
 forms.forEach(f=>{if(f.elements.direction.value===direction)f.elements.direction.value='';});state.country=null;
}
function selectWinterCountry(id){
 const country=winterDestinations.find(d=>d.id===id);if(!country)return;
 if(state.country?.id===id)clearWinterCountry();
 else{state.country=country;forms.forEach(f=>f.elements.direction.value=winterDirection(country));}
 state.season='winter';state.hotel=null;syncState();setPurpose('selection','winter-country');clearMessages();track('destination',{season:'winter',source:'winter-country'});
}
function hotelScenarioName(id){return scenarios.find(s=>s.id===id)?.name||'';}
function hotelPageSize(){return matchMedia('(max-width:600px)').matches?1:matchMedia('(max-width:900px)').matches?2:matchMedia('(max-width:1199px)').matches?3:4;}
function orderHotels(list){
 const priced=list.filter(h=>h.priceStatus==='priced'&&Number.isFinite(h.priceAmount)).sort((a,b)=>a.priceAmount-b.priceAmount);
 const pending=list.filter(h=>h.priceStatus!=='priced'||!Number.isFinite(h.priceAmount));
 if(cfg.hotel_catalogue?.pending_placement==='second-page'){
  const n=hotelPageSize();return [...priced.slice(0,n),...pending,...priced.slice(n)];
 }
 return [...priced,...pending];
}
function renderHotels(){
 $('#dt-hotel-track').innerHTML=hotels.map(h=>{
  const priced=h.priceStatus==='priced'&&Number.isFinite(h.priceAmount);
  const price=priced?'от '+h.priceAmount.toLocaleString('ru-RU')+' '+escapeHTML(h.priceCurrency||'BYN'):'Цена на просчёте';
  return '<article class="dt-hotel-card" data-hotel="'+h.id+'" data-price-status="'+(priced?'priced':'pending')+'" data-price="'+(priced?h.priceAmount:'')+'"><div class="dt-hotel-media'+(h.image?' dt-hotel-has-photo':'')+'">'+(h.image?'<img src="'+escapeHTML(h.image)+'" alt="'+escapeHTML(h.imageAlt||h.name)+'" loading="lazy" decoding="async">':'')+'<span class="dt-hotel-category">'+h.category+'*</span></div><div class="dt-hotel-body"><h3>'+escapeHTML(h.name)+'</h3>'+(h.region?'<p class="dt-hotel-region">'+escapeHTML(h.region)+'</p>':'')+'<p class="dt-hotel-scenario" data-hotel-scenario-label>'+escapeHTML(hotelScenarioName(h.scenarios?.[0]))+'</p><p class="dt-hotel-description">'+escapeHTML(h.description||'')+'</p><div class="dt-hotel-bottom"><div class="dt-hotel-price" data-price-status="'+(priced?'priced':'pending')+'" data-active-offers><strong>'+price+'</strong>'+(priced?'<span class="dt-hotel-price-basis">'+escapeHTML(h.priceBasis||'1/2 DBL')+'</span>':'')+'</div><button type="button" class="dt-action" data-select-hotel="'+h.id+'">Подобрать этот отель</button>'+(h.selectionUrl?'<a class="dt-hotel-offer-link" href="'+escapeHTML(h.selectionUrl)+'" target="_blank" rel="noopener" data-hotel-offer="'+h.id+'"><span>Посмотреть туры</span><i aria-hidden="true" data-dt-icon="arrow-up-right"></i></a>':'')+'</div></div></article>';
 }).join('');
}
function syncHotelCatalogue(){
 const track=$('#dt-hotel-track');if(!track?.children.length)return;
 const key=state.scenario+'|'+(cfg.hotel_catalogue?.pending_placement==='second-page'?hotelPageSize():'all');
 if(key===catalogueViewKey)return;
 const matching=hotels.filter(h=>state.scenario==='all'||(h.scenarios||[]).includes(state.scenario));
 const visible=new Set(matching.map(h=>h.id)),cards=new Map(Array.from(track.children).map(el=>[el.dataset.hotel,el]));
 for(const h of [...orderHotels(matching),...hotels.filter(h=>!visible.has(h.id))]){
  const card=cards.get(h.id);if(!card)continue;card.hidden=!visible.has(h.id);
  card.querySelector('[data-hotel-scenario-label]').textContent=hotelScenarioName(state.scenario==='all'?h.scenarios?.[0]:state.scenario);
  track.appendChild(card);
 }
 catalogueViewKey=key;track.scrollLeft=0;
 requestAnimationFrame(()=>updateCarousel('hotel'));
}

function syncState(){
 const scenario=scenarios.find(x=>x.id===state.scenario);
 const description=seasons[state.season]+' · '+(state.season==='winter'?(state.country?.name||'Любое направление'):(scenario?scenario.name:'Любой сценарий'));
 forms.forEach(f=>{
  f.elements.season.value=state.season;f.elements.scenario.value=state.scenario;f.elements.budgetLevel.value=state.budget;
  f.elements.hotelId.value=state.hotel?.id||'';f.elements.hotelLabel.value=state.hotel?.name||'';
  f.querySelector('[data-selected-hotel]').hidden=!state.hotel;
  f.querySelector('[data-selected-name]').textContent=state.hotel?.name||'';
 });
 $('#dt-hotel-season').value='summer';$('#dt-hotel-scenario').value=state.scenario;
 $$('[data-season]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.season===state.season)));
 $('#dt-panel-summer').hidden=state.season!=='summer';$('#dt-panel-winter').hidden=state.season!=='winter';
 $$('[data-scenario]').forEach(b=>{const chosen=b.dataset.scenario===state.scenario;b.setAttribute('aria-pressed',String(chosen));b.querySelector('.dt-scenario-check').textContent=chosen?'Выбрано':'Выбрать сценарий';});
 $$('[data-winter-country]').forEach(b=>{const chosen=b.dataset.winterCountry===state.country?.id;b.setAttribute('aria-pressed',String(chosen));b.querySelector('.dt-winter-country-select').textContent=chosen?'Выбрано':'Выбрать направление';});
 $('#dt-reset-scenario').textContent=state.season==='winter'?'Любое направление':'Любой сценарий';
 $('#dt-selection-label').textContent=description;
 $$('[data-hotel-summer-note]').forEach(el=>el.hidden=campaignState().status==='ended');
 syncHotelCatalogue();
 requestAnimationFrame(()=>updateCarousel('hotel'));
}
function changeSeason(season){if(season==='summer')clearWinterCountry();state.season=season;if(state.hotel&&season==='winter'){state.hotel=null;setPurpose('selection','season');}syncState();clearMessages();track('season',{season,source:'selection'});}
function moveTo(id,focus=false){const target=$(id);if(!target)return;updateHeader();target.scrollIntoView({behavior:motion(),block:'start'});if(focus)target.querySelector('input:not([type="hidden"]):not([name="website"])')?.focus({preventScroll:true});}
function setPurpose(goal,source){if(campaignState().status==='ended'&&goal==='booking')goal='selection';forms.forEach(f=>{f.elements.purpose.value=goal;f.elements.source.value=source||'page';const labels={selection:'Подобрать тур к распродаже',hotel:'Рассчитать выбранный отель',booking:'Записаться на бронирование'};const b=f.querySelector('[data-submit-label]');if(!b.disabled)b.textContent=campaignState().status==='ended'?'Подобрать актуальный тур':f.elements.formVariant?.value==='quick'?'Подобрать тур':labels[goal];});}
function selectHotel(id,source){const h=priorities.find(x=>x.id===id);if(!h)return;clearWinterCountry();state.hotel=h;state.season='summer';syncState();setPurpose('hotel',source);track('hotel',{hotelId:h.id,source});moveTo('#dt-request',true);}
// Consent stores preferences only. Form contents remain in memory, never analytics or storage.
const storageKey='dtbf26-consent-v1';let consent={analytics:false},hasChoice=false;
try{const stored=JSON.parse(localStorage.getItem(storageKey)||'null');if(stored&&stored.version===1){consent={analytics:stored.analytics===true};hasChoice=true;}}catch{}
const cookieDialog=$('#dt-cookie-dialog');
function openCookieSettings(){$('#dt-consent-analytics').checked=consent.analytics;if(cookieDialog.showModal)cookieDialog.showModal();else cookieDialog.setAttribute('open','');}
function closeCookieSettings(){if(cookieDialog.close)cookieDialog.close();else cookieDialog.removeAttribute('open');}
function saveConsent(next){const revoke=consent.analytics&&!next.analytics;consent=next;hasChoice=true;try{localStorage.setItem(storageKey,JSON.stringify({version:1,...consent,updatedAt:new Date().toISOString()}));}catch{}
 $('#dt-cookie-banner').hidden=true;closeCookieSettings();root.dispatchEvent(new CustomEvent('dtbf26:consent',{detail:{...consent}}));
 if(revoke){location.reload();return;}
}
function track(action,data={}){
 const safe={action,source:String(data.source||'page').slice(0,60)};
 for(const k of ['season','scenario','hotelId','purpose','network'])if(typeof data[k]==='string')safe[k]=data[k].slice(0,100);
 root.dispatchEvent(new CustomEvent('dtbf26:event',{detail:safe}));
 if(!consent.analytics)return;
 if(cfg.analytics?.ga_installed&&typeof window.gtag==='function')window.gtag('event','dtbf26_'+action,safe);
 if(typeof window.ym==='function')for(const id of cfg.analytics?.yandex_ids||[])window.ym(Number(id),'reachGoal','dtbf26_'+action,safe);
}
$('#dt-cookie-banner').hidden=hasChoice;
$$('[data-cookie-choice]').forEach(b=>b.addEventListener('click',()=>saveConsent({analytics:b.dataset.cookieChoice==='all'})));
$$('[data-cookie-settings]').forEach(b=>b.addEventListener('click',()=>openCookieSettings()));
$('#dt-cookie-save').addEventListener('click',()=>saveConsent({analytics:$('#dt-consent-analytics').checked}));
$('#dt-cookie-close').addEventListener('click',closeCookieSettings);
const viewer=$('#dt-viewer');let viewerTrigger=null;
function renderReviews(){const list=Array.isArray(cfg.reviews)?cfg.reviews:[];
 $('#dt-trust').hidden=list.length===0;
 $('#dt-review-track').innerHTML=list.map((r,i)=>'<article class="dt-review"><button type="button" class="dt-review-button" data-review="'+i+'" aria-label="Увеличить отзыв '+escapeHTML(r.author)+'"><img src="'+escapeHTML(r.image)+'" alt="Отзыв '+escapeHTML(r.author)+'" loading="lazy"></button></article>').join('');
 const links=cfg.review_links||{};
 $('.dt-review-links').innerHTML=(links.yandex&&links.google)?'<span>Больше отзывов в <a href="'+escapeHTML(links.yandex)+'" target="_blank" rel="noopener">Яндекс</a> и <a href="'+escapeHTML(links.google)+'" target="_blank" rel="noopener">Гугл</a></span>':'';
}
function closeViewer(){if(viewer.close)viewer.close();else viewer.removeAttribute('open');viewerTrigger?.focus();}
$('.dt-dialog-close').addEventListener('click',closeViewer);viewer.addEventListener('click',e=>{if(e.target===viewer)closeViewer();});
root.addEventListener('click',e=>{
 const menu=e.target.closest('.dt-menu-button');if(menu){const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');$('#dt-navigation').dataset.open=String(open);updateHeader();return;}
 const season=e.target.closest('[data-season]');if(season){changeSeason(season.dataset.season);return;}
 const country=e.target.closest('[data-winter-country]');if(country){selectWinterCountry(country.dataset.winterCountry);return;}
 const scenario=e.target.closest('[data-scenario]');if(scenario){state.scenario=state.scenario===scenario.dataset.scenario?'all':scenario.dataset.scenario;syncState();clearMessages();track('scenario',{scenario:state.scenario,source:'scenario'});return;}
 const hotel=e.target.closest('[data-select-hotel],[data-select-priority]');if(hotel){selectHotel(hotel.dataset.selectHotel||hotel.dataset.selectPriority,hotel.dataset.selectPriority?'priority-list':'hotel-slider');return;}
 const remove=e.target.closest('[data-remove-hotel]');if(remove){state.hotel=null;syncState();setPurpose('selection','hotel-removed');return;}
 const review=e.target.closest('[data-review]');if(review){const r=cfg.reviews[Number(review.dataset.review)];if(!r)return;viewerTrigger=review;$('#dt-viewer-title').textContent=r.author;$('#dt-viewer-content').innerHTML='<img src="'+escapeHTML(r.image)+'" alt="Отзыв '+escapeHTML(r.author)+'"><p>'+escapeHTML(r.tripType||'')+'</p>';if(viewer.showModal)viewer.showModal();else viewer.setAttribute('open','');return;}
 const offer=e.target.closest('[data-hotel-offer]');if(offer){track('hotel_offer',{hotelId:offer.dataset.hotelOffer,source:'hotel-card'});return;}
 const tracked=e.target.closest('[data-track]');if(tracked)track(tracked.dataset.track,{source:tracked.closest('.dt-header')?'header':'contacts',network:tracked.dataset.network||''});
 const anchor=e.target.closest('a[href^="#"]');if(anchor){const id=anchor.getAttribute('href');if(!$(id))return;e.preventDefault();if(anchor.dataset.goal){setPurpose(anchor.dataset.goal,anchor.dataset.source);if(anchor.dataset.goal==='booking')track('booking',{purpose:'booking',source:anchor.dataset.source});}
  moveTo(id,id==='#dt-request'||id==='#dt-quick-form');$('#dt-navigation').dataset.open='false';$('.dt-menu-button').setAttribute('aria-expanded','false');updateHeader();
 }
});
root.addEventListener('keydown',e=>{if(e.key==='Escape'){if(viewer.hasAttribute('open'))closeViewer();if(cookieDialog.hasAttribute('open'))closeCookieSettings();$$('.dt-phones[open]').forEach(d=>{d.open=false;d.querySelector('summary').focus();});$('#dt-navigation').dataset.open='false';$('.dt-menu-button').setAttribute('aria-expanded','false');updateHeader();}});
document.addEventListener('click',e=>$$('.dt-phones[open]').forEach(d=>{if(!d.contains(e.target))d.open=false;}));
$('.dt-tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const season=e.key==='Home'?'summer':e.key==='End'?'winter':state.season==='summer'?'winter':'summer';changeSeason(season);$('#dt-tab-'+season).focus();}});
$('#dt-hotel-season').addEventListener('change',e=>changeSeason(e.target.value));$('#dt-hotel-scenario').addEventListener('change',e=>{state.scenario=e.target.value;syncState();});$('#dt-reset-scenario').addEventListener('click',()=>{if(state.season==='winter')clearWinterCountry();else state.scenario='all';syncState();});
function validContact(v){v=v.trim();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)||(/^\+?[\d\s()\-]{7,25}$/.test(v)&&v.replace(/\D/g,'').length>=7&&v.replace(/\D/g,'').length<=15)||/^@[A-Za-z0-9_]{3,32}$/.test(v)||/^(?:https?:\/\/)?t\.me\/[A-Za-z0-9_]{3,32}$/.test(v);}
function validateForm(f){let first=null;for(const field of ['contact','email','consent','ages']){const el=f.elements[field];if(!el)continue;let good=true,text='';
 if(field==='contact'){const phone=f.elements.formVariant?.value==='quick';good=phone?/^\+?[\d\s()\-]{7,25}$/.test(el.value.trim())&&el.value.replace(/\D/g,'').length>=7&&el.value.replace(/\D/g,'').length<=15:validContact(el.value);text=phone?'Введите телефон с кодом страны.':'Введите телефон с кодом страны, email или Telegram @username.';}
 if(field==='email'){good=!el.value.trim()||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());text='Проверьте адрес email.';}
 if(field==='consent'){good=el.checked;text='Нужно согласие на обработку персональных данных.';}
 if(field==='ages'&&Number(f.elements.children.value)>0){const ages=el.value.match(/\d+/g)||[];good=/^[0-9\s,;]+$/.test(el.value)&&ages.length===Number(f.elements.children.value)&&ages.every(n=>Number(n)<=17);text='Укажите возраст каждого ребёнка от 0 до 17 лет.';}
 el.setAttribute('aria-invalid',String(!good));const error=f.querySelector('#'+f.id.replace('-form','')+'-'+field+'-error');if(error)error.textContent=good?'':text;if(!good&&!first)first=el;
 }if(first){if(first.type==='hidden'){message(f,'Проверьте возраст детей в подробной форме.','error');moveTo('#dt-request',true);}else first.focus();return false;}return true;}
let contextPromise=null;
function getFormContext(refresh=false){if(refresh)contextPromise=null;if(contextPromise)return contextPromise;if(!cfg.ajaxUrl)return Promise.reject(new Error('Form configuration unavailable'));
 contextPromise=fetch(cfg.ajaxUrl+'?action=dtbf26_form_context',{credentials:'same-origin',cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok||!j.success)throw new Error('Form context unavailable');return j.data;}).catch(e=>{contextPromise=null;throw e;});return contextPromise;
}
getFormContext().catch(()=>{});
function requestID(){return crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');}
async function submitForm(f){if(f._busy||!validateForm(f))return;const values=new FormData(f);const canonical=JSON.stringify(Array.from(values.entries()));
 if(f._sentPayload===canonical){message(f,'Заявка уже принята. Менеджер свяжется с вами.','success');return;}
 if(f._payload!==canonical){f._payload=canonical;f._requestId=requestID();}
 f._busy=true;f.setAttribute('aria-busy','true');const button=f.querySelector('[type="submit"]'),label=button.textContent;button.disabled=true;button.textContent='Отправляем…';message(f,'Отправляем вашу заявку…','loading');
 try{const context=await getFormContext();for(const k of ['nonce','issued','token'])values.append(k,context[k]);values.append('requestId',f._requestId);values.append('action','dtbf26_submit');
 const params=new URLSearchParams(location.search);for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'])if(params.has(key))values.append(key,params.get(key).slice(0,200));
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);let response;
 try{response=await fetch(cfg.ajaxUrl,{method:'POST',body:values,credentials:'same-origin',signal:controller.signal});}finally{clearTimeout(timeout);}
 const result=await response.json();if(!response.ok||!result.success){if(result.data?.code==='expired_context')contextPromise=null;if(result.data?.code==='mail_failed'){f._payload=null;f._requestId=null;}throw new Error(result.data?.message||'Не удалось отправить заявку. Попробуйте ещё раз или позвоните менеджеру.');}
 f._sentPayload=canonical;message(f,result.data.message||'Спасибо! Заявка принята. Менеджер свяжется с вами.','success');track('form_accepted',{purpose:f.elements.purpose.value,source:f.elements.source.value});
 }catch(e){message(f,e.name==='AbortError'?'Не удалось получить ответ вовремя. Повторная отправка с теми же данными проверит статус заявки без дублирования.':e.message==='Form context unavailable'||e.message==='Form configuration unavailable'?'Не удалось подготовить отправку. Обновите страницу или позвоните менеджеру.':e instanceof SyntaxError||e instanceof TypeError?'Не удалось получить ответ сервера. Попробуйте ещё раз или позвоните менеджеру.':e.message,'error');}
 finally{f._busy=false;f.setAttribute('aria-busy','false');button.disabled=false;button.textContent=label;}
}
forms.forEach(f=>{f.elements.adults.value='2';childrenChanged(f);f.addEventListener('submit',e=>{e.preventDefault();submitForm(f);});f.elements.children.addEventListener('change',()=>childrenChanged(f));f.elements.season.addEventListener('change',e=>changeSeason(e.target.value));f.elements.purpose.addEventListener('change',()=>{setPurpose(f.elements.purpose.value,f.elements.source.value);if(f.elements.purpose.value==='booking')track('booking',{purpose:'booking',source:f.elements.source.value});});
 f.addEventListener('input',e=>{clearMessages();if(['contact','direction','period','duration','adults','children','ages','budgetAmount','wishes'].includes(e.target.name)){for(const other of forms){if(other!==f)if(other.elements[e.target.name])other.elements[e.target.name].value=e.target.value;childrenChanged(other);}}if(e.target.name==='direction'&&state.country&&e.target.value!==winterDirection(state.country)){state.country=null;syncState();}});
});
const payments=Array.isArray(cfg.payments)?cfg.payments:[];$('#dt-payments').innerHTML=payments.map(p=>'<img src="'+escapeHTML(p.image)+'" alt="'+escapeHTML(p.name)+'" loading="lazy">').join('');$('#dt-payments').hidden=payments.length===0;
window.addEventListener('resize',()=>{syncHotelCatalogue();requestAnimationFrame(()=>updateCarousel('hotel'));},{passive:true});
renderScenarios();renderWinterCountries();renderHotels();renderReviews();syncState();bindCarousel('hotel');bindCarousel('review');icons();updateTimer();setInterval(updateTimer,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDatatourBF26,{once:true});else initDatatourBF26();
})();
