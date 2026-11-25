jest.mock('notion-utils', () => ({
  idToUuid: id =>
    `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}))
import { convertInnerUrl } from '@/lib/db/notion/convertInnerUrl'
import { slimLinkPages, slimNavPages } from '@/lib/utils/slimNavPages'

const nav = [{ title: 't', summary: 's', slug: 'article/a', href: '/article/a', short_id: 'x' }]

describe('slimNavPages', () => {
  test('next 主题只留 slug', () => {
    expect(slimNavPages(nav, 'next')).toEqual([{ slug: 'article/a' }])
  })
  test('其他主题保留完整列表', () => {
    expect(slimNavPages(nav, 'heo')).toBe(nav)
    expect(slimNavPages(undefined, 'next')).toBeUndefined()
  })
})

describe('slimLinkPages', () => {
  test('只留短 ID 和地址', () => {
    expect(slimLinkPages([{ ...nav[0], type: 'Post' }])).toEqual([
      { short_id: 'x', href: '/article/a' }
    ])
  })
  test('瘦身后的对照表仍能把正文里的 Notion 链接换成站内地址', () => {
    document.body.innerHTML = `<div id="notion-article"><a class="notion-link" href="https://www.notion.so/4aea95fb3fd5fcf81846aaaaaaaaaaaa?pvs=4">x</a></div>`
    convertInnerUrl({
      lang: 'zh-CN',
      allPages: slimLinkPages([
        { title: 'L', type: 'Post', slug: 'article/l', href: '/article/l', short_id: 'fcf8-1846-aaaaaaaaaaaa' }
      ])
    })
    expect(document.querySelector('a').getAttribute('href')).toBe('/article/l')
  })
})
