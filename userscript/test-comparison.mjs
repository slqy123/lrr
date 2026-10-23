import assert from 'node:assert/strict'
import { test } from 'node:test'
import { archiveTags, archiveSource, ehGallery, sourceRelation } from '../web/src/userscript/comparison.ts'

const current = 'https://e-hentai.org/g/1739174/c456740f0e/'

test('real library source tags resolve without a URL scheme or trailing slash', () => {
  const tags = archiveTags('source:exhentai.org/g/1739174/c456740f0e,date_added:1773914151,language:chinese')
  const source = archiveSource(tags.get('source'), current)
  assert.equal(source?.gallery?.id, '1739174')
  assert.equal(source?.url, 'https://exhentai.org/g/1739174/c456740f0e/')
  assert.equal(sourceRelation(current, source.url), 'same')
})

test('EH sources support both tag delimiters and URL forms across hosts', () => {
  for (const separator of [',', ';']) {
    for (const host of ['exhentai.org', 'e-hentai.org', 'g.e-hentai.org']) {
      for (const prefix of ['', '//', 'http://', 'https://']) {
        const tags = archiveTags(`language:japanese${separator}source:${prefix}${host}/g/1739174/c456740f0e${separator}artist:kantoku`)
        assert.equal(archiveSource(tags.get('source'), current)?.gallery?.id, '1739174')
        assert.deepEqual(tags.get('artist'), ['kantoku'])
      }
    }
  }
})

test('source selection prefers the current gallery and rejects unrelated hosts', () => {
  assert.equal(archiveSource(['exhentai.org/g/2359058/12a4b4f84f', 'e-hentai.org/g/1739174/c456740f0e'], current)?.gallery?.id, '1739174')
  for (const value of ['evil.test/g/1739174/c456740f0e', 'https://exhentai.org.evil.test/g/1739174/c456740f0e', 'javascript:exhentai.org/g/1739174/c456740f0e', 'https://evil.test@exhentai.org/g/1739174/c456740f0e', 'https://exhentai.org:444/g/1739174/c456740f0e']) {
    assert.equal(ehGallery(value), undefined)
  }
})
