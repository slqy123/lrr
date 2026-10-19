import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const dir = mkdtempSync(join(tmpdir(), 'lrr-ui-'))
const script = readFileSync(new URL('../lanraragi-checker.user.js', import.meta.url), 'utf8')
const fixture = `<!doctype html><meta charset="utf-8"><div><input id="f_search" aria-label="Search"></div><div class="itg">${[1, 2, 3, 4, 5, 6].map(id => `<div class="gl1t"><a href="https://exhentai.org/g/${id}/test/"><span class="glink">[Author] Gallery ${id}</span></a></div>`).join('')}</div>
<script>
const values = {panelCollapsed:false};
window.GM_getValue=(key,fallback)=>key in values?values[key]:fallback;
window.GM_setValue=(key,value)=>values[key]=value;
window.GM_addStyle=css=>{const style=document.createElement('style');style.textContent=css;document.head.append(style)};
window.GM_setClipboard=text=>window.copied=text;
window.confirm=()=>true;
let failSend=true,hold=false,held=[];
window.GM_xmlhttpRequest=options=>{
  if(options.url.endsWith('/add')) {
    if(failSend)setTimeout(()=>options.onerror(new Error('offline')),20);
    else setTimeout(()=>options.onload({status:200,responseText:JSON.stringify({ok:true,added:1,duplicates:0})}),50);
    return;
  }
  const id=Number((decodeURIComponent(options.url).match(/\\/g\\/(\\d+)/)||[])[1]);
  const duplicate=decodeURIComponent(options.url).includes('Gallery+6');
  const reply=()=>id===5?options.onerror(new Error('offline')):options.onload({status:200,responseText:JSON.stringify(options.url.includes('/api/search')?(duplicate?{recordsFiltered:1,data:[{id:'duplicate',title:'Similar'}]}:{recordsFiltered:0,data:[]}):id===1?{success:1,data:{id:'abc',title:'Existing'}}:{success:0,data:{error:'URL not found in database.'}})});
  if(hold)held.push(()=>options.onload({status:200,responseText:JSON.stringify({success:1,data:{id:'stale',title:'Stale'}})}));else setTimeout(reply,5);
};
</script><script>${script.replaceAll('</script', '<\\/script')}</script><script>
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
(async()=>{
  await pause(150);
  const root=document.querySelector('#lrr-tools').shadowRoot;
  const button=action=>root.querySelector('[data-action="'+action+'"]');
  assert(document.querySelectorAll('.lrr-item-checkbox').length===6,'checkbox count');
  assert(document.querySelectorAll('[data-lrr-status="missing"]').length===3,'finished missing status');
  assert(document.querySelectorAll('[data-lrr-status="downloaded"]').length===1,'downloaded status');
  assert(document.querySelectorAll('[data-lrr-status="error"]').length===1,'error status');
  assert(document.querySelectorAll('[data-lrr-status="duplicate"]').length===1,'duplicate status');
  document.querySelector('.lrr-marker-downloaded').dispatchEvent(new MouseEvent('mouseenter'));
  const card=document.querySelector('.lrr-hover-card.show');
  const suggestion=document.querySelector('#lrr-search-suggest');
  assert(card&&suggestion,'hover card and search suggestions available');
  const surface=()=>getComputedStyle(root.querySelector('.panel')).backgroundColor;
  assert(getComputedStyle(card).backgroundColor===surface(),'light card matches panel');
  assert(getComputedStyle(suggestion).backgroundColor===surface(),'light suggestions match panel');
  const primary=getComputedStyle(button('send')).backgroundColor;
  const channels=primary.match(/\\d+/g).map(Number);
  assert(channels[1]>channels[0]&&channels[1]>channels[2],'green primary accent');
  document.querySelector('#f_search').focus();
  assert(suggestion.classList.contains('open'),'suggestions open on focus');
  root.querySelector('[data-select="duplicate"]').click();
  assert(document.querySelectorAll('.lrr-item-checkbox:checked').length===1,'select duplicate');
  root.querySelector('[data-select="missing"]').click();
  assert(document.querySelectorAll('.lrr-item-checkbox:checked').length===3,'select missing');
  button('copy').click();assert(window.copied.split('\\n').length===3,'copy');
  button('send').click();await pause(80);
  assert(document.querySelectorAll('.lrr-item-checkbox:checked').length===3,'failure preserves selection');
  assert(root.querySelector('.feedback').classList.contains('error'),'error feedback');
  root.querySelector('[data-select="none"]').click();
  const checks=document.querySelectorAll('.lrr-item-checkbox');checks[1].click();
  failSend=false;button('send').click();checks[2].click();await pause(100);
  assert(!checks[1].checked&&checks[2].checked,'send only clears submitted selection');
  button('settings').click();assert(root.querySelector('dialog').open,'settings opens');
  assert(root.querySelector('[name=lrrApiKey]').type==='password','key masked');
  root.querySelector('[name=theme]').value='dark';
  root.querySelector('form').requestSubmit();await pause(100);
  assert(values.theme==='dark','theme persisted');
  assert(document.querySelector('#lrr-tools').dataset.theme==='dark','theme applied');
  assert(getComputedStyle(card).backgroundColor===surface(),'dark card matches panel');
  assert(getComputedStyle(suggestion).backgroundColor===surface(),'dark suggestions match panel');
  assert(getComputedStyle(card).color===getComputedStyle(root.querySelector('.panel')).color,'shared dark text');
  assert(checks[2].checked,'save keeps manual selection');
  hold=true;button('recheck').click();await pause(30);
  assert(document.querySelectorAll('[data-lrr-status="checking"]').length===6,'recheck starts');
  hold=false;button('recheck').click();await pause(100);
  for(const reply of held)reply();await pause(50);
  assert(document.querySelectorAll('[data-lrr-status="missing"]').length===3,'stale responses ignored');
  assert(document.querySelectorAll('[data-lrr-status="downloaded"]').length===1,'stale hits cannot replace fresh results');
  const row=document.createElement('div');row.className='gl1t';row.innerHTML='<a href="https://exhentai.org/g/7/test/"><span class="glink">[Author] Gallery 7</span></a>';
  document.querySelector('.itg').append(row);await pause(600);
  assert(row.querySelector('.lrr-item-checkbox'),'dynamic gallery checkbox');
  assert(row.querySelector('[data-lrr-status="missing"]'),'dynamic gallery checked');
  const rect=root.querySelector('.panel').getBoundingClientRect();
  assert(rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,'panel within viewport');
  button('close').click();assert(root.querySelector('.panel').hidden,'close');
  root.querySelector('.launcher').click();assert(!root.querySelector('.panel').hidden,'reopen');
  document.body.dataset.result='PASS';
})().catch(error=>{document.body.dataset.result='FAIL: '+error.message});
</script>`
try {
  const file = join(dir, 'test.html')
  writeFileSync(file, fixture)
  for (const [width, height] of [[1200, 900], [420, 380]]) {
    const result = spawnSync(process.env.CHROMIUM || 'chromium', ['--headless', '--no-sandbox', '--disable-gpu', `--user-data-dir=${join(dir, `profile-${width}`)}`, '--no-proxy-server', '--allow-file-access-from-files', '--virtual-time-budget=4000', `--window-size=${width},${height}`, '--dump-dom', `file://${file}`], { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 })
    const status = result.stdout?.match(/data-result="([^"]*)"/)?.[1]
    if (status !== 'PASS') throw new Error(`${width}×${height}: ${status || result.error || result.stderr}`)
    console.log(`${width}×${height}: PASS`)
  }
} finally { rmSync(dir, { recursive: true, force: true }) }
