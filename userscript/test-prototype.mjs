import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

if (!process.argv[2]) throw new Error('Usage: node userscript/test-prototype.mjs <generated-prototype.html>')
const file = resolve(process.argv[2])
const html = readFileSync(file, 'utf8')
const dir = mkdtempSync(join(tmpdir(), 'lrr-prototype-'))
const tests = `<script>
setTimeout(()=>{
 try {
  const assert=(ok,message)=>{if(!ok)throw new Error(message)};
  const cards=[...document.querySelectorAll('.gallery')];
  assert(cards.length===25,'25 real galleries');
  assert(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
  assert([...document.querySelectorAll('.cover img')].every(img=>img.complete&&img.naturalWidth>0),'embedded covers loaded');
  for(const card of cards){
   const cover=card.querySelector('.cover').getBoundingClientRect();
   const controls=card.querySelector('.card-state').getBoundingClientRect();
   const title=card.querySelector('.gallery-title').getBoundingClientRect();
   assert(cover.bottom<=controls.top+.5&&controls.bottom<=title.top+.5,'in-flow controls below cover');
   assert(title.height<=57,'title limited to three lines');
   assert(getComputedStyle(card.querySelector('img')).objectFit==='contain','uncropped covers');
   assert(card.querySelector('.gallery-title').title===card.querySelector('.gallery-title').textContent,'full title tooltip');
  }
  const columns=getComputedStyle(document.querySelector('.gallery-grid')).gridTemplateColumns.split(' ').length;
  if(innerWidth>=350&&innerWidth<=620)assert(columns===2,'two columns on mobile');
  if(innerWidth<=340)assert(columns===1,'one column on narrow viewport');
  document.querySelector('[data-filter=categories]').click();
  assert(!document.querySelector('#categories').hidden,'categories expand');
  const chipCount=document.querySelectorAll('.chip').length;
  document.querySelector('.chip').click();
  assert(document.querySelectorAll('.chip').length===chipCount-1,'filter chip removed');
  document.querySelector('[data-filter=categories]').click();
  document.querySelector('[data-filter=advanced]').click();
  assert(!document.querySelector('#advanced').hidden,'advanced expands');
  document.querySelector('[data-filter=advanced]').click();
  document.querySelector('[data-density=compact]').click();
  assert(document.documentElement.dataset.density==='compact','compact density');
  document.querySelector('[data-density=standard]').click();
  document.querySelector('[data-action=settings]').click();
  assert(document.querySelector('#settings').open,'settings dialog');
  const theme=document.querySelector('#theme');theme.value='light';theme.dispatchEvent(new Event('change'));
  assert(document.documentElement.dataset.theme==='light','light theme');
  theme.value='dark';theme.dispatchEvent(new Event('change'));
  document.querySelector('#settings').close();
  const selector=document.querySelector('#selection');selector.value='missing';selector.dispatchEvent(new Event('change'));
  const selected=cards.filter(card=>card.querySelector('input').checked);
  assert(selected.length>0&&selected.every(card=>card.querySelector('.state.missing')),'select missing excludes queued and unknown');
  assert(!document.querySelector('#selection-bar').hidden,'selection bar appears');
  document.querySelector('[data-action=clear]').click();
  assert(document.querySelector('#selection-bar').hidden,'selection bar disappears');
  cards[0].querySelector('input').click();cards[1].querySelector('input').click();
  assert(document.querySelector('#selected-count').textContent==='2','selected count');
  const blue=getComputedStyle(cards[0].querySelector('.gallery-title')).color.match(/\\d+/g).map(Number);
  assert(blue[2]>blue[1]&&blue[1]>blue[0],'blue title selection');
  document.querySelector('[data-action=send]').click();
  assert(document.querySelector('#selected-count').textContent==='2'&&document.querySelector('#toast').textContent.includes('未发送真实请求'),'mock send preserves selection');
  cards[0].querySelector('.state').click();
  assert(document.querySelector('#details').open&&document.querySelector('#detail-content').textContent.includes('离线模拟'),'state details');
  document.querySelector('#details').close();
  document.querySelector('#search-form').requestSubmit();
  assert(document.querySelector('#toast').textContent.includes('未执行网络请求'),'mock search');
  const previous=location.href;cards[0].querySelector('.cover').click();
  assert(location.href===previous,'mock navigation');
  const bar=document.querySelector('#selection-bar').getBoundingClientRect();
  assert(bar.left>=0&&bar.right<=innerWidth,'selection bar within viewport');
  document.querySelector('#toast').hidden=true;
  document.body.dataset.result='PASS';
 }catch(error){document.body.dataset.result='FAIL '+error.message}
},700);
</script>`
try {
  const fixture = join(dir, 'test.html')
  writeFileSync(fixture, html.replace('</body>', tests + '</body>'))
  for (const [width, height] of [[1440, 1100], [1100, 900], [390, 844], [320, 700]]) {
    const screenshot = join(dirname(file), `prototype-${width}.png`)
    const result = spawnSync(process.env.CHROMIUM || 'chromium', ['--headless', '--no-sandbox', '--disable-gpu', '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND', `--user-data-dir=${join(dir, `profile-${width}`)}`, `--window-size=${width},${height}`, '--force-device-scale-factor=1', '--virtual-time-budget=1800', `--screenshot=${screenshot}`, '--dump-dom', pathToFileURL(fixture).href], { encoding: 'utf8', timeout: 30000, maxBuffer: 5 * 1024 * 1024 })
    const status = result.stdout?.match(/data-result="([^"]*)"/)?.[1]
    if (status !== 'PASS') throw new Error(`${width}×${height}: ${status || result.error || result.stderr}`)
    console.log(`${width}×${height}: PASS — ${screenshot}`)
  }
} finally { rmSync(dir, { recursive: true, force: true }) }
