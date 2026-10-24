/** @jest-environment node */
import BLOG from '@/blog.config'
import { getFreeDay, getFreeIssues, getPaywall } from '@/lib/utils/paywall'
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
