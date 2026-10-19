import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

if (!process.argv[2]) throw new Error('Usage: node userscript/test-offline.mjs <saved-gallery.html> [screenshot-directory]')
const source = resolve(process.argv[2])
const original = readFileSync(source, 'utf8')
const nativeScript = original.match(/src="([^"]*ehg_index[^\"]*)"/)?.[1]
if (!nativeScript) throw new Error('Saved page must include its native gallery search script')
const native = readFileSync(resolve(dirname(source), nativeScript), 'utf8')
const html = original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
const script = readFileSync(new URL('../lanraragi-checker.user.js', import.meta.url), 'utf8')
const dir = mkdtempSync(join(tmpdir(), 'lrr-offline-'))
const boot = `<script>${native.replaceAll('</script', '<\\/script')}</script><script>
const titles=[...document.querySelectorAll('.gl1t .glink')];
const duplicateFixture=__DUPLICATE__;
if(duplicateFixture)titles[7].textContent='[Offline Author] Duplicate Gallery';
const baseline=titles.map(title=>({text:title.textContent,url:title.closest('a').href}));
const sourceForm=document.querySelector('#searchbox form');
const gradientStyle=document.createElement('style');
gradientStyle.textContent='.ct3 { background:radial-gradient(rgb(231,140,26),rgb(252,180,23));border-color:rgb(231,140,26) }';
document.head.append(gradientStyle);
if(__EMPTY_ADVANCED__){document.querySelector('#advdiv').replaceChildren();document.querySelector('a[onclick*="toggle_advsearch_pane"]').textContent='Show Advanced Options';}
const fields=[...sourceForm.elements].map(field=>({field,name:field.name,value:field.value,checked:field.checked}));
const navLinks=[...document.querySelectorAll('#nb a')];
const next=document.querySelector('#unext'),nextHref=next.href;
const urls=baseline.map(item=>item.url);
let failSend=true,sendCount=0;
const values={theme:'dark',enableAltSearch:duplicateFixture,redesigned:JSON.parse(sessionStorage.getItem('lrr-test-redesigned')??'__REDESIGNED__')};
window.ulhost='https://upld.exhentai.org/';
window.GM_getValue=(key,fallback)=>values[key]??fallback;
window.GM_setValue=(key,value)=>{values[key]=value;if(key==='redesigned')sessionStorage.setItem('lrr-test-redesigned',JSON.stringify(value))};
window.GM_addStyle=css=>{const style=document.createElement('style');style.textContent=css;document.head.append(style)};
window.GM_setClipboard=text=>window.copied=text;
window.GM_xmlhttpRequest=options=>setTimeout(()=>{
 if(options.url.endsWith('/add')){sendCount++;if(failSend)options.onerror(new Error('offline'));else options.onload({status:200,responseText:JSON.stringify({ok:true,added:1,duplicates:0})});return}
 if(options.url.endsWith('/api/tasks/lookup')){options.onload({status:200,responseText:JSON.stringify({items:['pending','running','failed','dead'].map((status,i)=>({url:urls[i+2],status,attempts:status==='pending'?0:1,max_attempts:3}))})});return}
 if(options.url.includes('/api/search?')){const hit=new URL(options.url).searchParams.get('filter')==='Offline Author,Duplicate Gallery';options.onload({status:200,responseText:JSON.stringify({recordsFiltered:hit?1:0,data:hit?[{id:'duplicate',title:'Duplicate Gallery'}]:[]})});return}
 const url=new URL(options.url).searchParams.get('arg');
 if(url===urls[6]){options.onerror(new Error('offline'));return}
 options.onload({status:200,responseText:JSON.stringify(url===urls[0]?{success:1,data:{id:'archive',title:'Existing'}}:{success:0,data:{error:'URL not found in database.'}})});
},5);
</script>`
const tests = `<script>
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const luminance=color=>color.match(/[0-9.]+/g).slice(0,3).map(Number).map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
function assertThemeContrast(page){
 const probe=document.createElement('span');page.append(probe);
 for(const [foreground,background] of [['text','bg'],['muted','surface'],['on-accent','accent'],['selection','selection-soft'],['library','bg'],['queue','bg'],['duplicate','bg'],['warning','bg'],['error','bg']]){
  probe.style.color='var(--lrr-'+foreground+')';probe.style.backgroundColor='var(--lrr-'+background+')';
  const style=getComputedStyle(probe);
  assert(contrast(style.color,style.backgroundColor)>=4.5,'theme text contrast '+foreground+'/'+background);
 }
 for(const category of page.querySelectorAll('[id^=cat_]')){
  probe.style.color=category.style.getPropertyValue('--lrr-category-ink');probe.style.backgroundColor=category.style.getPropertyValue('--lrr-category-color');
  const style=getComputedStyle(probe);assert(contrast(style.color,style.backgroundColor)>=4.5,'native category text contrast '+category.id);
 }
 probe.remove();
}
(async()=>{
 await pause(800);
 const tools=document.querySelector('#lrr-tools').shadowRoot;
 assert(titles.length===25,'25 original galleries');
 if(!values.redesigned){
  assert(!document.querySelector('.lrr-page'),'native fallback');
  assert(!tools.querySelector('.launcher').hidden,'native launcher available');
  const button=document.querySelector('.searchnav .lrr-redesigned-view');
  assert(button?.textContent==='美化界面'&&button.type==='button','native toolbar offers redesigned view');
  sessionStorage.setItem('lrr-native-return','true');button.click();return;
 }
 const page=document.querySelector('.lrr-page');
 assert(page,'redesigned page');
 assertThemeContrast(page);
 assert(tools.querySelector('.launcher').hidden&&tools.querySelector('.panel').hidden,'old panel replaced');
 assert(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
 for(const saved of fields)assert(saved.field.form===sourceForm&&saved.field.name===saved.name&&(!saved.name||saved.field.value===saved.value)&&saved.field.checked===saved.checked,'original form fields preserved '+saved.name);
 assert(navLinks.every(link=>page.contains(link)),'native navigation links preserved');
 assert(page.contains(next)&&next.href===nextHref,'native pagination preserved');
 window.prevurl='https://exhentai.org/?prev=1';window.nexturl=nextHref;
 page.querySelector('#ujump').click();await pause(20);
 assert(page.querySelector('#ujumpbox .jumpdate')?.textContent==='按日期选择','native jump controls styled and translated');
 const jumpPopover=page.querySelector('#ujumpbox .jumppop').getBoundingClientRect();
 assert(getComputedStyle(page.querySelector('#ujumpbox .jumppop')).position==='absolute'&&jumpPopover.left>=0&&jumpPopover.right<=innerWidth,'jump popover stays anchored within viewport');
 page.querySelector('#ujumpbox input[value="1d"]').click();await pause(20);
 assert(new URL(next.href).searchParams.get('jump')==='1d'&&next.textContent==='向后跳转 ›','native jump semantics preserved');
 page.querySelector('#ujumpbox .jumpcancel').click();await pause(20);
 assert(next.href===nextHref&&page.querySelector('#ujump').textContent==='跳转 ⌄','cancel restores native pagination');
 for(let i=0;i<titles.length;i++){
  const title=titles[i],card=title.closest('.gl1t'),cover=card.querySelector('.gl3t');
  const controls=card.querySelector('.lrr-gallery-tools');
  assert(title.textContent===baseline[i].text&&title.title===baseline[i].text.trim(),'full title preserved');
  assert(title.closest('a').href===baseline[i].url,'native gallery link');
  const coverRect=cover.getBoundingClientRect(),controlRect=controls.getBoundingClientRect(),titleRect=title.getBoundingClientRect();
  assert(Math.abs(coverRect.width/coverRect.height-.75)<.01,'consistent portrait cover');
  assert(getComputedStyle(cover.querySelector('img')).objectFit==='contain','cover not cropped');
  assert(coverRect.bottom<=controlRect.top+.5&&controlRect.bottom<=titleRect.top+.5,'cover then controls then title');
  assert(titleRect.height<=3*parseFloat(getComputedStyle(title).lineHeight),'natural title height capped at three lines');
  assert(!controls.closest('a'),'controls separate from navigation');
  assert(controls.querySelector('input').getAttribute('aria-label')==='选择 '+baseline[i].text.trim(),'checkbox identifies its gallery');
  assert(getComputedStyle(card.querySelector('.lrr-category')).boxShadow==='none','native category shadow removed');
  const visible=[...controls.querySelectorAll('button')].filter(button=>getComputedStyle(button).display!=='none');
  assert(visible.length===1&&visible[0].textContent,'one visible text status per card');
 }
 const missing=document.querySelector('[data-lrr-state=missing] .lrr-check-state');
 const queued=document.querySelector('[data-lrr-state=queued] .lrr-check-state');
 assert(missing.textContent==='未收录'&&missing.querySelector('svg'),'missing status with book icon');
 assert(queued.textContent.includes('在队列中'),'queue label');
 assert(getComputedStyle(missing).color===getComputedStyle(page.querySelector('.lrr-statistics')).color,'missing uses muted gray');
 const queueColor=getComputedStyle(queued).color;
 assert(queueColor!==getComputedStyle(page.querySelector('.lrr-brand')).color,'queue status differs from neutral branding');
 assert(queueColor!==getComputedStyle(page.querySelector('.lrr-primary')).backgroundColor,'queue status differs from primary actions');
 const retrying=document.querySelector('[data-lrr-state=retrying] .lrr-check-state');
 const queueFailed=document.querySelector('[data-lrr-state=queue-failed] .lrr-check-state');
 assert(getComputedStyle(retrying).color!==queueColor,'retry uses warning instead of processing color');
 assert(getComputedStyle(queueFailed).color!==queueColor&&getComputedStyle(queueFailed).color!==getComputedStyle(retrying).color,'failure differs from processing and retry');
 assert(getComputedStyle(missing).color!==getComputedStyle(queued).color,'gray missing differs from teal queue');
 queued.click();assert(document.querySelector('.lrr-state-dialog').open,'queue details accessible by click');document.querySelector('.lrr-state-dialog').close();
 const mask=document.querySelector('#f_cats'),originalMask=Number(mask.value);
 document.querySelector('#cat_2').click();assert(Number(mask.value)===(originalMask^2),'native category toggle');
 assert(document.querySelector('#cat_2').hasAttribute('data-disabled')===Boolean((originalMask^2)&2),'category appearance reflects the native mask');
 document.querySelector('#cat_2').click();assert(Number(mask.value)===originalMask,'native category toggle restores original field');
 const categoryNames=[...page.querySelectorAll('[id^=cat_]')].map(node=>node.textContent);
 for(const value of [originalMask,0]){
  mask.value=String(value);document.dispatchEvent(new Event('lrr:filters'));
  assert([...page.querySelectorAll('.lrr-filter-chip')].every(button=>!categoryNames.some(name=>button.getAttribute('aria-label')==='移除条件 '+name)),'expanded categories do not produce duplicate chips');
 }
 mask.value=String(originalMask);document.dispatchEvent(new Event('lrr:filters'));
 const categorySizes=()=>[...page.querySelectorAll('[id^=cat_]')].map(node=>{const rect=node.getBoundingClientRect();return [rect.width,rect.height]});
 const closedSizes=JSON.stringify(categorySizes());
 const advanced=page.querySelector('#advdiv').closest('details');advanced.open=true;await pause(10);
 assert(getComputedStyle(page.querySelector('#f_srdd')).display!=='none','advanced form visible');
 assert(JSON.stringify(categorySizes())===closedSizes,'opening advanced filters preserves category dimensions');
 advanced.open=false;await pause(10);
 assert(JSON.stringify(categorySizes())===closedSizes,'closing advanced filters preserves category dimensions');
 const mainForm=sourceForm;const fileLink=page.querySelector('a[onclick*="toggle_filesearch"]');fileLink.click();
 const upload=document.querySelector('#fsdiv input[type=file]');assert(upload&&upload.form!==mainForm&&!mainForm.contains(upload),'file search keeps separate form');fileLink.click();
 assert(!page.querySelector('.lrr-categories summary')&&getComputedStyle(page.querySelector('.lrr-categories .itc')).display!=='none','categories stay visible without a heading');
 assert(page.querySelector('.lrr-search-options').parentElement.classList.contains('lrr-search-row'),'combined options disclosure sits beside search controls');
 assert(getComputedStyle(page.querySelector('.lrr-extra-options #rangebar')).width!=='720px','native range selector adapts to the options panel width');
 const options=page.querySelector('.lrr-search-options');options.open=true;await pause(10);
 assert(getComputedStyle(options.querySelector('.lrr-extra-options')).position==='absolute','combined options open as an anchored dropdown');options.open=false;
 assert(!page.querySelector('.lrr-intro'),'search replaces generic introduction');
 assert(!page.querySelector('[data-choice=none]'),'no redundant clear selection controls');
 assert(page.querySelectorAll('.lrr-bulk [data-choice]').length===5,'four status groups and select all');
 const groupMenu=page.querySelector('.lrr-selection-groups');
 const collapsed=matchMedia('(max-width: 1100px)').matches;
 assert(groupMenu.open!==collapsed,'selection groups collapse only on narrow desktops');
 const center=rect=>(rect.top+rect.bottom)/2;
 if(innerWidth>=900){
  const stats=page.querySelector('.lrr-statistics').getBoundingClientRect();
  const actions=page.querySelector('.lrr-result-actions').getBoundingClientRect();
  const bulk=page.querySelector('.lrr-bulk').getBoundingClientRect();
  const pager=page.querySelector('.lrr-top-pagination').getBoundingClientRect();
  assert(Math.abs(center(stats)-center(actions))<1,'first toolbar row shares a center line');
  assert(Math.abs(center(bulk)-center(pager))<1,'second toolbar row shares a center line');
  assert(Math.abs(stats.left-bulk.left)<1&&Math.abs(actions.right-pager.right)<1,'toolbar rows share outer edges');
  assert(page.querySelector('[data-choice=all]').getBoundingClientRect().right+8<=pager.left,'selection controls do not overlap pagination');
  const search=page.querySelector('.lrr-search').getBoundingClientRect();
  const shell=page.querySelector('main').getBoundingClientRect();
  assert(Math.abs((search.left+search.right)/2-(shell.left+shell.right)/2)<1,'search module is centered');
  const categoryTable=page.querySelector('.lrr-categories .itc').getBoundingClientRect();
  const searchRow=page.querySelector('.lrr-search-row').getBoundingClientRect();
  const options=page.querySelector('.lrr-search-options > summary').getBoundingClientRect();
  const searchButton=page.querySelector('.lrr-search-row input[type=submit]').getBoundingClientRect();
  const clearButton=page.querySelector('.lrr-search-row input[type=button]').getBoundingClientRect();
  assert(categoryTable.bottom<searchRow.top,'categories sit above the search field');
  assert(Math.abs((categoryTable.left+categoryTable.right)/2-(search.left+search.right)/2)<1,'category table is centered within search');
  assert(options.left>=clearButton.right,'filter and tools disclosure sits to the right of search buttons');
  assert(Math.abs(searchButton.height-clearButton.height)<1&&Math.abs(searchButton.width-clearButton.width)<1,'search and clear buttons share dimensions');
  assert(Math.abs(searchButton.height-options.height)<1&&Math.abs(searchButton.width-options.width)<1,'all search controls share dimensions');
  assert(getComputedStyle(page.querySelector('.lrr-search-row input[type=submit]')).backgroundColor!==getComputedStyle(page.querySelector('.lrr-search-row input[type=button]')).backgroundColor,'primary search remains blue-tinted beside neutral controls');
 }
 assert(page.querySelector('.lrr-topbar [data-tool=backend]'),'backend is in the header');
 const categoryColors=[...page.querySelectorAll('[id^=cat_]')].map(node=>node.style.getPropertyValue('--lrr-category-color'));
 assert(new Set(categoryColors).size===10,'all categories retain distinct identifying colors');
 assert(page.querySelector('#cat_4').style.getPropertyValue('--lrr-category-color')==='rgb(184, 119, 75)','category palette is independent of native gradients');
 for(const category of page.querySelectorAll('[id^=cat_]')){
  const disabled=category.hasAttribute('data-disabled');
  if(disabled)category.click();
  assert(getComputedStyle(category).backgroundColor===category.style.getPropertyValue('--lrr-category-color'),'enabled category renders its identifying color '+category.id);
  assert(getComputedStyle(category).backgroundImage==='none','native gradients do not obscure category color '+category.id);
  if(disabled)category.click();
 }
 if(collapsed){groupMenu.querySelector('summary').click();assert(groupMenu.open,'status selection menu opens');}
 const missingChoice=page.querySelector('.lrr-bulk [data-choice=missing]');
 const idleBackground=getComputedStyle(missingChoice).backgroundColor;
 const idleWidth=missingChoice.getBoundingClientRect().width;
 assert(missingChoice.querySelector('svg')?.getAttribute('aria-hidden')==='true','group has a decorative line icon');
 assert(missingChoice.querySelector('.lrr-choice-state').textContent==='','idle choice hides checkmark');
 assert(missingChoice.getAttribute('aria-pressed')==='false','bulk choice initially inactive');
 const duplicateChoice=page.querySelector('.lrr-bulk [data-choice=duplicate]');
 assert(getComputedStyle(missingChoice).color===getComputedStyle(duplicateChoice).color,'idle choices are neutral regardless of category');
 missingChoice.click();
 assert(missingChoice.getAttribute('aria-pressed')==='true','bulk choice reflects selected set');
 assert(getComputedStyle(missingChoice).backgroundColor!==idleBackground,'active choice has a distinct background');
 assert(missingChoice.querySelector('.lrr-choice-state').textContent==='✓','active choice has a visible checkmark');
 assert(!collapsed||groupMenu.open,'group selection keeps menu open');
 assert(missingChoice.getBoundingClientRect().width===idleWidth,'selection does not shift button layout');
 assert(getComputedStyle(missingChoice).backgroundColor!==getComputedStyle(page.querySelector('.lrr-primary')).backgroundColor,'selection differs from primary actions');
 assert(page.querySelector('.lrr-selection-bar').hidden===false,'selection bar appears');
 assert([...document.querySelectorAll('.lrr-item-checkbox:checked')].every(check=>check.closest('.gl1t').querySelector('[data-lrr-state=missing]')),'select missing excludes queue and errors');
 missingChoice.click();
 assert(page.querySelector('.lrr-selection-bar').hidden&&missingChoice.getAttribute('aria-pressed')==='false','clicking active choice clears selection');
 missingChoice.click();
 document.querySelector('[data-lrr-state=missing]').closest('.gl1t').querySelector('.lrr-item-checkbox').click();
 assert(missingChoice.getAttribute('aria-pressed')==='mixed'&&missingChoice.querySelector('.lrr-choice-state').textContent==='−','manual partial selection has a mixed state');
 missingChoice.click();assert(missingChoice.getAttribute('aria-pressed')==='true','partial selection can be completed');
 const allChoice=page.querySelector('.lrr-bulk [data-choice=all]');
 allChoice.click();assert(allChoice.getAttribute('aria-pressed')==='true'&&missingChoice.getAttribute('aria-pressed')==='true','select all updates bulk states');
 allChoice.click();assert(page.querySelector('.lrr-selection-bar').hidden,'select all toggles off');
 const otherCheck=document.querySelector('[data-lrr-state=downloaded]').closest('.gl1t').querySelector('.lrr-item-checkbox');
 otherCheck.click();missingChoice.click();
 assert(otherCheck.checked&&missingChoice.getAttribute('aria-pressed')==='true','group selection preserves selections outside the group');
 missingChoice.click();
 assert(otherCheck.checked&&document.querySelectorAll('.lrr-item-checkbox:checked').length===1,'group deselection preserves selections outside the group');
 otherCheck.click();
 const queueChoice=page.querySelector('[data-choice=queue]');
 queueChoice.click();
 assert(queueChoice.getAttribute('aria-pressed')==='true'&&queueChoice.querySelector('.lrr-choice-count').textContent==='4','queue group includes all four queue statuses');
 assert(document.querySelectorAll('.lrr-item-checkbox:checked').length===4,'queue selection excludes other groups');
 missingChoice.click();queueChoice.click();
 assert(missingChoice.getAttribute('aria-pressed')==='true'&&queueChoice.getAttribute('aria-pressed')==='false','queue can toggle independently from missing');
 allChoice.click();
 assert(document.querySelectorAll('.lrr-item-checkbox:checked').length===titles.length,'select all includes lookup errors');
 assert(page.querySelector('.lrr-statistics').textContent.includes('查询异常 1'),'lookup errors appear in statistics');
 allChoice.click();assert(page.querySelector('.lrr-selection-bar').hidden,'select all clears all selections');
 const downloadedChoice=page.querySelector('[data-choice=downloaded]');
 downloadedChoice.click();assert(otherCheck.checked&&downloadedChoice.getAttribute('aria-pressed')==='true','library group is selectable');
 downloadedChoice.click();
 if(duplicateFixture){
  missingChoice.click();duplicateChoice.click();
  assert(duplicateChoice.getAttribute('aria-pressed')==='true'&&missingChoice.getAttribute('aria-pressed')==='true','duplicate and missing groups can both be selected');
  duplicateChoice.click();assert(missingChoice.getAttribute('aria-pressed')==='true','duplicate deselection preserves missing group');
  missingChoice.click();
 }else assert(duplicateChoice.disabled&&duplicateChoice.querySelector('.lrr-choice-count').textContent==='0','empty group is disabled with a zero count');
 if(collapsed){
  groupMenu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!groupMenu.open&&document.activeElement===groupMenu.querySelector('summary'),'Escape closes menu and restores focus');
  groupMenu.querySelector('summary').click();page.querySelector('.lrr-statistics').click();assert(!groupMenu.open,'outside click closes group menu');
 }
 const checks=document.querySelectorAll('.lrr-item-checkbox');checks[0].click();
 const originalFrame=getComputedStyle(checks[0].closest('.gl1t'),'::after').boxShadow;
 assert(originalFrame==='none','no selected card pseudo-element overlay');
 const color=getComputedStyle(titles[0]).color.match(/\\d+/g).map(Number);assert(color[2]>color[1]&&color[1]>color[0],'selected title blue');
 page.querySelector('[data-tool=copy]').click();assert(window.copied===urls[0],'real clipboard callback');
 page.querySelector('[data-tool=send]').click();assert(page.querySelector('[data-tool=send]').disabled,'send disabled in flight');
 await pause(50);assert(checks[0].checked&&page.querySelector('.lrr-feedback').textContent.includes('选择已保留'),'send failure retains selection');
 assert(!page.querySelector('[data-tool=send]').disabled,'send enabled after failure');
 failSend=false;page.querySelector('[data-tool=send]').click();checks[1].click();await pause(60);
 assert(!checks[0].checked&&checks[1].checked&&sendCount===2,'successful send clears only submitted selection');
 page.querySelector('[data-tool=settings]').click();assert(tools.querySelector('dialog').open,'real settings dialog');
 tools.querySelector('[name=theme]').value='light';tools.querySelector('form').requestSubmit();await pause(100);
 assert(document.documentElement.dataset.lrrTheme==='light'&&values.theme==='light','theme persisted');
 assertThemeContrast(page);
 page.querySelector('[data-tool=settings]').click();tools.querySelector('[name=theme]').value='dark';tools.querySelector('form').requestSubmit();await pause(100);
 page.querySelector('[data-density=compact]').click();assert(values.density==='compact'&&page.dataset.density==='compact','density persisted');page.querySelector('[data-density=standard]').click();
 const columnCount=getComputedStyle(document.querySelector('.itg')).gridTemplateColumns.split(' ').length;
 if(innerWidth>=350&&innerWidth<=620)assert(columnCount===2,'mobile two-column grid');
 if(innerWidth<=340)assert(columnCount===1,'extreme narrow one-column grid');
 const bar=page.querySelector('.lrr-selection-bar').getBoundingClientRect();assert(bar.left>=0&&bar.right<=innerWidth,'selection bar in viewport');
 assert(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow after interactions');
 document.querySelector('.lrr-marker-downloaded').dispatchEvent(new MouseEvent('mouseenter'));assert(document.querySelector('.lrr-hover-card.show'),'library hover details preserved');document.querySelector('.lrr-hover-card.show').classList.remove('show');
 page.querySelector('.lrr-feedback').hidden=true;
 document.body.dataset.result='PASS redesigned'+(sessionStorage.getItem('lrr-native-return')?' · returned from native':'');
})().catch(error=>document.body.dataset.result='FAIL '+error.message);
</script>`
try {
  for (const [width, height, redesigned, emptyAdvanced = false, duplicate = false] of [[1440, 1100, true], [1200, 900, true], [1101, 900, true], [1100, 900, true], [900, 900, true], [390, 844, true], [320, 700, true], [1440, 1100, false], [900, 900, true, true], [1440, 1100, true, false, true]].filter(([width])=>!process.env.LRR_TEST_DESKTOP_ONLY||width>=900)) {
    const injected = boot.replace('__REDESIGNED__', String(redesigned)).replace('__EMPTY_ADVANCED__', String(emptyAdvanced)).replace('__DUPLICATE__', String(duplicate)) + `<script>${script.replaceAll('</script', '<\\/script')}</script>` + tests
    const fixture = html.replace('<head>', `<head><base href="${pathToFileURL(dirname(source) + '/').href}">`).replace('</body>', injected + '</body>')
    const file = join(dir, 'offline.html')
    writeFileSync(file, fixture)
    const screenshot = process.argv[3] && redesigned ? [`--screenshot=${resolve(process.argv[3], `gallery-${width}.png`)}`] : []
    const result = spawnSync(process.env.CHROMIUM || 'chromium', ['--headless', '--no-sandbox', '--disable-gpu', '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND', '--allow-file-access-from-files', `--user-data-dir=${join(dir, `profile-${width}-${redesigned}`)}`, `--window-size=${width},${height}`, '--virtual-time-budget=3500', ...screenshot, '--dump-dom', pathToFileURL(file).href], { encoding: 'utf8', timeout: 30000, maxBuffer: 5 * 1024 * 1024 })
    const status = result.stdout?.match(/data-result="([^"]*)"/)?.[1]
    if (!status?.startsWith('PASS')) throw new Error(`${width}×${height}: ${status || result.error || result.stderr}`)
    console.log(`${width}×${height}: ${status}${emptyAdvanced ? ' · initially empty advanced filters' : ''}${duplicate ? ' · duplicate gallery' : ''}`)
  }
} finally { rmSync(dir, { recursive: true, force: true }) }
