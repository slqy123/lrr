import base64
import json
import os
import time
from pathlib import Path


ROOT = "document.querySelector('#lrr-app').shadowRoot"
OUTPUT = Path('userscript/dist/comparison')
OUTPUT.mkdir(parents=True, exist_ok=True)


def click_named(name, role='button'):
    nodes = cdp('Accessibility.getFullAXTree')['nodes']
    node = [node for node in nodes if node.get('role', {}).get('value') == role and node.get('name', {}).get('value') == name][-1]
    quad = cdp('DOM.getBoxModel', backendNodeId=node['backendDOMNodeId'])['model']['content']
    x, y = sum(quad[0::2]) / 4, sum(quad[1::2]) / 4
    assert 0 <= x < js('innerWidth') and 0 <= y < js('innerHeight'), f'{name} is outside the viewport'
    click_at_xy(x, y)
    time.sleep(.05)


def open_suggestions():
    if js(f"!!{ROOT}.querySelector('#lrr-suggestions[data-state=open]')"):
        return
    for _ in range(2):
        click_named('搜索作品', 'textbox')
        if js(f"!!{ROOT}.querySelector('#lrr-suggestions[data-state=open]')"):
            return
    raise RuntimeError('Quick filters did not open')


def capture(version, theme, width):
    time.sleep(.2)
    data = js(f"""(() => {{
      const r = {ROOT}, p = r.querySelector('#lrr-suggestions[data-state=open]').getBoundingClientRect();
      const s = r.querySelector('.search-panel').getBoundingClientRect();
      return {{
        width: innerWidth, zoom: visualViewport.scale,
        overflow: document.documentElement.scrollWidth > innerWidth,
        query: r.querySelector('[aria-label=搜索作品]').value,
        mask: r.querySelector('[name=f_cats]').value,
        compact: r.querySelector('.gallery-grid').dataset.compact,
        buttons: [...r.querySelectorAll('#lrr-suggestions button')].map(b => ({{
          label: b.textContent, pressed: b.getAttribute('aria-pressed'),
          width: b.getBoundingClientRect().width, className: b.className
        }})),
        clip: {{x:p.x-8,y:p.y-8,width:p.width+16,height:p.height+16,scale:1}},
        context: {{x:s.x-5,y:s.y-5,width:s.width+10,height:p.bottom-s.y+15,scale:1}}
      }};
    }})()""")
    assert data['width'] == width and data['zoom'] == 1 and not data['overflow']
    assert data['compact'] == str(width == 900).lower()
    assert data['query'] == 'language:chinese' and data['mask'] == '767'
    assert [button['pressed'] for button in data['buttons']] == ['true', 'false', 'true']
    assert sum(button['width'] for button in data['buttons']) + 16 <= data['clip']['width'] - 48
    for suffix, key in [('', 'clip'), ('-context', 'context')]:
        shot = cdp('Page.captureScreenshot', format='png', captureBeyondViewport=False, clip=data[key])
        (OUTPUT / f'chips-{version}-{theme}-{width}{suffix}.png').write_bytes(base64.b64decode(shot['data']))
    print(f'{version}: {theme}, {width}px verified and captured', flush=True)
    return data


results = {}
tabs = list_tabs()
for version in ['before', 'after']:
    url = os.environ[f'LRR_PREVIEW_{version.upper()}_URL']
    target = os.environ.get(f'LRR_PREVIEW_{version.upper()}_TAB') or next((tab['targetId'] for tab in tabs if tab['url'] == url), None)
    if target:
        activate_tab(target)
        switch_tab(target)
        goto_url(url)
    else:
        target = new_tab(url)
        activate_tab(target)
    wait_for_load()
    for _ in range(40):
        if js("!!document.querySelector('#lrr-app')?.shadowRoot?.querySelector('.live-app')"):
            break
        time.sleep(.1)
    open_suggestions()
    if not js(f"{ROOT}.querySelector('#lrr-suggestions button').getAttribute('aria-pressed') === 'true'"):
        click_named('仅中文')
    if not js(f"{ROOT}.querySelectorAll('#lrr-suggestions button')[2].getAttribute('aria-pressed') === 'true'"):
        click_named('全年龄')
    for width in [1440, 900]:
        cdp('Emulation.setDeviceMetricsOverride', width=width, height=1100, deviceScaleFactor=1, mobile=False)
        time.sleep(.05)
        click_named('标准' if width == 1440 else '紧凑')
        for theme in ['light', 'dark']:
            if js("document.querySelector('#lrr-app').classList.contains('dark')") != (theme == 'dark'):
                click_named('切换主题')
            open_suggestions()
            results[f'{version}-{theme}-{width}'] = capture(version, theme, width)
    cdp('Emulation.setDeviceMetricsOverride', width=1440, height=1100, deviceScaleFactor=1, mobile=False)
    time.sleep(.05)
    click_named('标准')
    open_suggestions()

(OUTPUT / 'chip-measurements.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
