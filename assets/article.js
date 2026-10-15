/* Article navigation and the same consent preference as the landing. No lead form or tracking. */
(()=>{'use strict';const root=document.getElementById('dt-bf26');if(!root)return;
const $=s=>root.querySelector(s),button=$('.dt-menu-button'),nav=$('#dt-navigation');
button?.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');nav.dataset.open=String(open);});
const key='dtbf26-consent-v1',banner=$('#dt-cookie-banner'),dialog=$('#dt-cookie-dialog');let preference={analytics:false},hasChoice=false;
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.version===1){preference.analytics=saved.analytics===true;hasChoice=true;}}catch{}
if(banner)banner.hidden=hasChoice;
const close=()=>{if(dialog?.close)dialog.close();else dialog?.removeAttribute('open');};
const save=analytics=>{preference.analytics=analytics;try{localStorage.setItem(key,JSON.stringify({version:1,analytics,updatedAt:new Date().toISOString()}));}catch{}if(banner)banner.hidden=true;close();};
root.querySelectorAll('[data-cookie-choice]').forEach(el=>el.addEventListener('click',()=>save(el.dataset.cookieChoice==='all')));
root.querySelectorAll('[data-cookie-settings]').forEach(el=>el.addEventListener('click',()=>{$('#dt-consent-analytics').checked=preference.analytics;if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}));
$('#dt-cookie-save')?.addEventListener('click',()=>save($('#dt-consent-analytics').checked));$('#dt-cookie-close')?.addEventListener('click',close);
root.addEventListener('keydown',event=>{if(event.key==='Escape'){root.querySelectorAll('.dt-phones[open]').forEach(el=>{el.open=false;el.querySelector('summary').focus();});if(button){button.setAttribute('aria-expanded','false');nav.dataset.open='false';}close();}});
document.addEventListener('click',event=>root.querySelectorAll('.dt-phones[open]').forEach(el=>{if(!el.contains(event.target))el.open=false;}));
root.querySelectorAll('[data-dt-icon="menu"]').forEach(el=>el.innerHTML='<svg aria-hidden="true" class="dt-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>');
// The address icon uses the same compact inline SVG as the landing.
root.querySelectorAll('[data-dt-icon="map-pin"]').forEach(el=>el.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>');
root.querySelectorAll('[data-dt-icon="arrow-up-right"]').forEach(el=>el.innerHTML='<svg aria-hidden="true" class="dt-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18 18 6M6 6h12v12"/></svg>');
})();
