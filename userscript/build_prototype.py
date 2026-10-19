import argparse
import base64
import json
import mimetypes
import re
from html.parser import HTMLParser
from pathlib import Path


class GalleryParser(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.source = source
        self.items = []
        self.card = None
        self.depth = 0
        self.title_depth = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get('class', '').split()
        if tag == 'div':
            self.depth += 1
            if 'gl1t' in classes:
                self.card = {'title': '', 'url': '', 'image': '', 'text': ''}
                self.card_depth = self.depth
            if self.card is not None and 'glink' in classes:
                self.title_depth = self.depth
        if self.card is None:
            return
        if tag == 'a' and '/g/' in attrs.get('href', ''):
            self.card['url'] = attrs['href']
        if tag == 'img' and not self.card['image']:
            image = self.source.parent / attrs.get('src', '')
            if image.is_file():
                mime = mimetypes.guess_type(image)[0] or 'image/webp'
                self.card['image'] = f'data:{mime};base64,' + base64.b64encode(image.read_bytes()).decode()

    def handle_data(self, text):
        if self.card is not None:
            self.card['text'] += text + ' '
            if self.title_depth is not None:
                self.card['title'] += text

    def handle_endtag(self, tag):
        if tag != 'div':
            return
        if self.title_depth == self.depth:
            self.title_depth = None
        if self.card is not None and self.card_depth == self.depth:
            text = self.card.pop('text')
            date = re.search(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}', text)
            pages = re.search(r'(\d+) pages', text)
            self.card.update(date=date[0] if date else '', pages=int(pages[1]) if pages else 0)
            self.items.append(self.card)
            self.card = None
        self.depth -= 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path, nargs='?', default=Path(__file__).parent / 'dist/prototype.html')
    args = parser.parse_args()
    galleries = GalleryParser(args.source)
    galleries.feed(args.source.read_text())
    if not galleries.items:
        parser.error('No thumbnail galleries found')
    template = Path(__file__).with_name('prototype.html').read_text()
    data = json.dumps(galleries.items, ensure_ascii=False).replace('<', '\\u003c')
    result = template.replace(
        '<script id="gallery-data" type="application/json">[]</script>',
        f'<script id="gallery-data" type="application/json">{data}</script>',
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result)
    print(f'{args.output.resolve()} — {len(galleries.items)} galleries')


if __name__ == '__main__':
    main()
