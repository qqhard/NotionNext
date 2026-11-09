/** @jest-environment node */
import BLOG from '@/blog.config'
import { getFreeDay, getFreeIssues, getPaywall, getPaywallPreview } from '@/lib/utils/paywall'
import { getPublicPostBlockMap } from '@/lib/utils/publicPost'

jest.mock('@/blog.config', () => ({
  LANG: 'zh-CN',
  PAYWALL_ENABLE: true,
  PAYWALL_TAGS: '日报,周报',
  PAYWALL_DAYS: 7,
  PAYWALL_SUBSTACK_URL: 'https://recsysfrontier.substack.com/',
  PAYWALL_SUBSTACK_PROPERTY: 'substack'
}))

const daily = {
  id: 'daily',
  type: 'Post',
  status: 'Published',
  slug: 'article/ai-daily-2026-10-24',
  tags: ['AI', '日报'],
  date: { start_date: '2026-10-24' },
  substack: 'https://recsysfrontier.substack.com/p/ai-daily-2026-10-24'
}
// 2026-10-24 + 7 天 = 10 月 31 日北京时间 0 点
const freeAt = Date.parse('2026-10-30T16:00:00Z')

afterEach(() => {
  BLOG.PAYWALL_ENABLE = true
})

it('locks tagged posts until 00:00 Beijing time on publish day + 7', () => {
  expect(getPaywall(daily, Date.parse('2026-10-24T05:00:00Z'))).toEqual({
    freeAt,
    url: daily.substack,
    isPost: true
  })
  expect(getPaywall(daily, freeAt - 1)).not.toBeNull()
  expect(getPaywall(daily, freeAt)).toBeNull()
  expect(getFreeDay(freeAt)).toEqual({ month: 10, day: 31 })
})

it('locks weekly posts and leaves other posts, pages and the switch-off case alone', () => {
  const now = Date.parse('2026-10-25T00:00:00Z')
  expect(getPaywall({ ...daily, tags: ['周报'] }, now)).not.toBeNull()
  expect(getPaywall({ ...daily, tags: ['LLM'] }, now)).toBeNull()
  expect(getPaywall({ ...daily, tags: undefined }, now)).toBeNull()
  expect(getPaywall({ ...daily, type: 'Page' }, now)).toBeNull()
  BLOG.PAYWALL_ENABLE = false
  expect(getPaywall(daily, now)).toBeNull()
})

it('falls back to the publish timestamp in Beijing time when Notion has no date', () => {
  // 北京时间 10 月 24 日 01:00，UTC 仍是 23 日
  const post = { ...daily, date: undefined, publishDate: Date.parse('2026-10-23T17:00:00Z') }
  expect(getPaywall(post, Date.parse('2026-10-25T00:00:00Z')).freeAt).toBe(freeAt)
  expect(getPaywall({ ...daily, date: undefined }, 0)).toBeNull()
})

it('links to the subscribe page until a valid https Substack link is recorded', () => {
  const now = Date.parse('2026-10-25T00:00:00Z')
  const subscribe = { url: 'https://recsysfrontier.substack.com/subscribe', isPost: false }
  expect(getPaywall({ ...daily, substack: '' }, now)).toMatchObject(subscribe)
  expect(getPaywall({ ...daily, substack: 'javascript:alert(1)' }, now)).toMatchObject(subscribe)
  expect(getPaywall({ ...daily, substack: 'http://insecure.example' }, now)).toMatchObject(subscribe)
})

it('keeps paywalled bodies out of RSS, search and list previews', () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-25T00:00:00Z'))
  const blocks = { block: { daily: { value: { id: 'daily', properties: { title: [['BODY']] } } } } }
  expect(getPublicPostBlockMap(daily, blocks)).toEqual({ block: {} })
  Date.now.mockReturnValue(freeAt)
  expect(JSON.stringify(getPublicPostBlockMap(daily, blocks))).toContain('BODY')
  Date.now.mockRestore()
})

it('lists the latest free issues of the same series, newest first', () => {
  const now = Date.parse('2026-10-25T00:00:00Z')
  const issue = (day, extra = {}) => ({
    ...daily,
    id: day,
    title: `AI 日报 ${day}`,
    href: `/article/ai-daily-${day}`,
    category: 'AI',
    date: { start_date: day },
    ...extra
  })
  const pages = [
    issue('2026-10-14'),
    issue('2026-10-24'), // 仍在锁定期
    issue('2026-10-17'),
    issue('2026-10-16', { category: '推荐' }), // 其他系列
    issue('2026-10-15', { tags: ['周报'] }), // 日报页面不展示周报
    issue('2026-10-13', { password: 'x' }),
    issue('2026-10-12', { status: 'Draft' }),
    issue('2026-10-11'),
    issue('2026-10-10')
  ]
  const current = { ...pages[1] }
  expect(getFreeIssues(current, pages, now)).toEqual([
    { title: 'AI 日报 2026-10-17', href: '/article/ai-daily-2026-10-17', day: '2026-10-17' },
    { title: 'AI 日报 2026-10-14', href: '/article/ai-daily-2026-10-14', day: '2026-10-14' },
    { title: 'AI 日报 2026-10-11', href: '/article/ai-daily-2026-10-11', day: '2026-10-11' }
  ])
  expect(getFreeIssues(current, undefined, now)).toEqual([])
})

it('locks posts with need_pay checked until it is unchecked', () => {
  const essay = { ...daily, type: 'Post', tags: ['LLM'], date: { start_date: '2020-01-01' } }
  const now = Date.parse('2026-10-25T00:00:00Z')
  expect(getPaywall({ ...essay, need_pay: 'Yes' }, now)).toEqual({
    freeAt: null,
    url: daily.substack,
    isPost: true
  })
  expect(getPaywall({ ...essay, type: 'Page', need_pay: 'Yes' }, now)).not.toBeNull()
  expect(getPaywall({ ...essay, need_pay: 'No' }, now)).toBeNull()
  expect(getPaywall(essay, now)).toBeNull()
  // 日报勾选后也不再按 7 天自动开放
  expect(getPaywall({ ...daily, need_pay: 'Yes' }, freeAt).freeAt).toBeNull()
  expect(getFreeIssues({ ...daily, need_pay: 'Yes' }, [daily], now)).toEqual([])
  BLOG.PAYWALL_ENABLE = false
  expect(getPaywall({ ...essay, need_pay: 'Yes' }, now)).toBeNull()
})

describe('getPaywallPreview', () => {
  // 根页面 + 若干顶层段落；ids 为空串时表示分隔符段落
  const page = (texts, extra = {}) => {
    const ids = texts.map((_, i) => `b${i}`)
    const block = {
      daily: { value: { id: 'daily', type: 'page', content: ids } },
      ...extra
    }
    texts.forEach((text, i) => {
      block[ids[i]] = {
        value: { id: ids[i], type: 'text', parent_id: 'daily', properties: { title: [[text]] } }
      }
    })
    return { block, signed_urls: Object.fromEntries(ids.map(id => [id, `https://s/${id}`])) }
  }
  const shown = preview => preview.block.daily.value.content

  afterEach(() => {
    delete BLOG.PAYWALL_MARKER
    delete BLOG.PAYWALL_PREVIEW_RATIO
  })

  it('cuts at the marker paragraph and hides the marker and everything after it', () => {
    const map = page(['一', '二', ' [paywall] ', '三'])
    const preview = getPaywallPreview(daily, map)
    expect(shown(preview)).toEqual(['b0', 'b1'])
    expect(Object.keys(preview.block).sort()).toEqual(['b0', 'b1', 'daily'])
    expect(Object.keys(preview.signed_urls)).toEqual(['b0', 'b1'])
    // 不改动传入的 blockMap
    expect(map.block.daily.value.content).toHaveLength(4)
  })

  it('shows the first 30% of top-level blocks, rounded up, when there is no marker', () => {
    expect(shown(getPaywallPreview(daily, page(Array(10).fill('段'))))).toEqual(['b0', 'b1', 'b2'])
    expect(shown(getPaywallPreview(daily, page(Array(4).fill('段'))))).toEqual(['b0', 'b1'])
    BLOG.PAYWALL_PREVIEW_RATIO = 0.5
    BLOG.PAYWALL_MARKER = '<more>'
    expect(shown(getPaywallPreview(daily, page(['一', '<more>', '三', '四'])))).toEqual(['b0'])
    expect(shown(getPaywallPreview(daily, page(Array(10).fill('段'))))).toHaveLength(5)
  })

  it('shows at least one block but never the whole article', () => {
    expect(shown(getPaywallPreview(daily, page(['一', '二'])))).toEqual(['b0'])
    expect(shown(getPaywallPreview(daily, page(['唯一一段'])))).toEqual([])
    expect(shown(getPaywallPreview(daily, page(['[paywall]', '二'])))).toEqual([])
  })

  it('does not end a ratio cut on a dangling heading', () => {
    const map = page(Array(10).fill('段'))
    map.block.b1.value.type = 'header'
    map.block.b2.value.type = 'sub_header'
    expect(shown(getPaywallPreview(daily, map))).toEqual(['b0'])
  })

  it('keeps nested children of shown blocks but not the contents of sub-pages', () => {
    const map = page(['一', '二', '三', '四'], {
      child: { value: { id: 'child', type: 'text', parent_id: 'b0', properties: { title: [['子']] } } },
      sub: { value: { id: 'sub', type: 'page', parent_id: 'b1', content: ['subText'] } },
      subText: { value: { id: 'subText', type: 'text', parent_id: 'sub' } }
    })
    map.block.b0.value.content = ['child']
    map.block.b1.value.content = ['sub']
    const preview = getPaywallPreview(daily, map)
    expect(Object.keys(preview.block).sort()).toEqual(['b0', 'b1', 'child', 'daily', 'sub'])
  })
})
