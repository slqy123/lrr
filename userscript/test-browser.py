import json
import os
import time
from urllib.request import Request, urlopen


ORIGIN = os.environ.get('LRR_TEST_ORIGIN', 'http://127.0.0.1:29683')
if ORIGIN not in {f'http://127.0.0.1:{port}' for port in (29683, 29684, 29685)}:
    raise ValueError('Use a project loopback test origin')
ROOT = "document.querySelector('#lrr-app')?.shadowRoot"


def backend(path, method='GET'):
    with urlopen(Request(ORIGIN + path, method=method), timeout=10) as response:
        return json.load(response)


def wait_for(predicate, message, timeout=45):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(.2)
    raise AssertionError(message)


def click_named(name, role='button'):
    matches = []
    def locate():
        nonlocal matches
        nodes = cdp('Accessibility.getFullAXTree')['nodes']
        matches = [node for node in nodes if node.get('role', {}).get('value') == role and node.get('name', {}).get('value') == name]
        return len(matches) == 1
    wait_for(locate, f'Expected one {role}: {name}', timeout=10)
    node = matches[0]['backendDOMNodeId']
    cdp('DOM.scrollIntoViewIfNeeded', backendNodeId=node)
    quad = cdp('DOM.getBoxModel', backendNodeId=node)['model']['content']
    click_at_xy(sum(quad[0::2]) / 4, sum(quad[1::2]) / 4)


def set_field(name, value):
    click_named(name, 'textbox')
    cdp('Input.dispatchKeyEvent', type='rawKeyDown', key='a', code='KeyA', modifiers=2, windowsVirtualKeyCode=65, commands=['SelectAll'])
    cdp('Input.dispatchKeyEvent', type='keyUp', key='a', code='KeyA', modifiers=2, windowsVirtualKeyCode=65)
    cdp('Input.insertText', text=value)
    assert js(f"{ROOT}.querySelector('[aria-label={json.dumps(name)}]').value === {json.dumps(value)}"), f'Failed to fill {name}'


def states():
    return js(f"[...{ROOT}.querySelectorAll('.status-action')].map(e=>e.getAttribute('aria-label').split('：').at(-1))")


def expect_state(label):
    wait_for(lambda: states() == [label] * count, f'Expected {count} galleries in state {label}; check GM permissions and backend logs')


def scenario(value):
    backend('/__scenario?value=' + value, 'POST')
    click_named('重新检查')


url = ORIGIN + '/snapshot.html'
target = next((tab['targetId'] for tab in list_tabs() if tab['url'] == url), None)
if target:
    switch_tab(target)
    cdp('Page.reload', ignoreCache=True)
else:
    target = new_tab(url)
activate_tab(target)
wait_for(lambda: js(f"!!{ROOT}?.querySelector('.live-app')"), 'No live application: install /install.user.js in Tampermonkey and enable local file access')
assert js("typeof window.GM_xmlhttpRequest === 'undefined'"), 'Page-side GM shim detected'
count = js(f"{ROOT}.querySelectorAll('.status-action').length")
assert count > 0, 'Snapshot did not produce real gallery cards'
backend('/__scenario?value=normal', 'POST')
assert js(f"{ROOT}.querySelector('[aria-label=搜索作品]').value === document.querySelector('#searchbox [name=f_search]').value"), 'Native search query was not preserved'
assert js(f"Number({ROOT}.querySelector('[name=f_cats]').value) === Number(document.querySelector('#searchbox [name=f_cats]')?.value || 0)"), 'Excluded category mask was not preserved'
assert js(f"(() => {{ const managed = new Set(['f_search','f_cats','advsearch','f_spf','f_spt','f_srdd','f_sh','f_sto','f_sfl','f_sfu','f_sft']); const native = [...new FormData(document.querySelector('#searchbox form'))].filter(([key,value]) => !managed.has(key) && typeof value === 'string'); const current = [...new FormData({ROOT}.querySelector('#lrr-search'))].filter(([key]) => !managed.has(key)); return JSON.stringify(native) === JSON.stringify(current); }})()"), 'Successful native search fields were not preserved'
print(f'Running real Tampermonkey checks on {count} galleries at {ORIGIN}', flush=True)
click_named('设置')
set_field('图库服务地址', ORIGIN + '/library')
set_field('API 密钥', 'offline-test-key')
set_field('队列服务地址', ORIGIN + '/queue')
click_named('保存并重新检查')
click_named('重新检查')
expect_state('未收录')
card = js(f"(() => {{ const card = {ROOT}.querySelector('.card-detail'); return {{url:card.href, name:card.getAttribute('aria-label')}}; }})()")
click_named(card['name'], 'link')
if card['url'] in backend('/__state')['nativePages']:
    wait_for(lambda: js(f"!!{ROOT}.querySelector('.detail-previews')"), 'Provided detail snapshot did not render')
else:
    wait_for(lambda: js(f"{ROOT}.querySelector('.detail-load-error')?.textContent.includes('LRR_NATIVE_PAGES')"), 'Missing detail snapshot was not explicitly reported')
if js(f"[...{ROOT}.querySelectorAll('.detail-tabs [role=tab]')].some(tab=>tab.textContent === 'BT 种子')"):
    click_named('BT 种子', 'tab')
    torrent_url = js(f"{ROOT}.querySelector('.torrent-toolbar a').href")
    if torrent_url in backend('/__state')['nativePages']:
        wait_for(lambda: js(f"!!{ROOT}.querySelector('.torrent-row') || {ROOT}.querySelector('.torrent-list').textContent.includes('原站暂无种子')"), 'Provided torrent snapshot did not render')
    else:
        wait_for(lambda: js(f"{ROOT}.querySelector('.torrent-list [role=alert]')?.textContent.includes('LRR_NATIVE_PAGES')"), 'Missing torrent snapshot was not explicitly reported')
click_named('收起作品详情')
requests = backend('/__state')['requests']
assert any(r['path'] == '/library/api/plugins/use' and r['authorization'] for r in requests), 'No authenticated library GM request'
assert any(r['path'] == '/queue/api/tasks/lookup' for r in requests), 'No queue GM request'
assert not any(r['authorization'] for r in requests if r['path'].startswith('/queue/')), 'Library authorization leaked to queue'
for failure in ('library-error', 'queue-error'):
    scenario(failure)
    expect_state('查询异常')
    assert js(f"{ROOT}.querySelector('[aria-label=选择未收录]').disabled"), 'Unknown results counted as missing'
for hit in ('library-hit', 'library-hit-queue-error'):
    scenario(hit)
    expect_state('已入库')
scenario('send-error')
expect_state('未收录')
click_named('选择全部作品', 'checkbox')
click_named('发送队列')
wait_for(lambda: any(r['path'] == '/queue/add' for r in backend('/__state')['requests']), 'Send did not reach local backend')
wait_for(lambda: js(f"{ROOT}.textContent.includes('选择已保留，可以重试。')"), 'Failed send did not settle')
assert js(f"!!{ROOT}.querySelector('[aria-label=批量操作]')"), 'Failed send cleared selection'
assert not backend('/__state')['tasks'], 'Failed send created tasks'
backend('/__scenario?value=normal', 'POST')
click_named('发送队列')
wait_for(lambda: len(backend('/__state')['tasks']) == count, 'Successful send did not enqueue all selected galleries')
wait_for(lambda: js(f"!{ROOT}.querySelector('[aria-label=批量操作]')"), 'Successful send did not clear submitted selection')
cdp('Page.reload', ignoreCache=True)
wait_for(lambda: js(f"!!{ROOT}?.querySelector('.live-app')"), 'Application did not remount')
expect_state('在队列中')
requests = backend('/__state')['requests']
assert not any(r['authorization'] for r in requests if r['path'].startswith('/queue/')), 'Library authorization leaked to queue'
print(f'PASS: {count} real-page galleries; GM settings persistence, library/queue requests, library-hit precedence, error classification, send retention and success', flush=True)
