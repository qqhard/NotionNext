/** @jest-environment node */
import { cleanPostSummary, resolvePostProps } from '@/lib/db/SiteDataApi'
import { isPaywalled } from '@/lib/utils/paywall'
import { getOrSetDataWithCache } from '@/lib/cache/cache_manager'
import { fetchNotionPageBlocks } from '@/lib/db/notion/getPostBlocks'

jest.mock('@/blog.config', () => ({
  NOTION_PAGE_ID: 'audit-root',
  LANG: 'zh-CN',
  LINK: 'https://example.invalid',
  AUTHOR: 'Audit',
  POST_RECOMMEND_COUNT: 6,
  PAYWALL_ENABLE: true,
  PAYWALL_TAGS: '日报,周报',
  PAYWALL_DAYS: 7,
  PAYWALL_SUBSTACK_URL: 'https://recsysfrontier.substack.com',
  PAYWALL_SUBSTACK_PROPERTY: 'substack'
}))
jest.mock('@/lib/cache/cache_manager', () => ({
  getOrSetDataWithCache: jest.fn()
}))
jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: {}
}))
jest.mock('@/lib/db/notion/getNotionPost', () => ({
  fetchPageFromNotion: jest.fn()
}))
jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  fetchNotionPageBlocks: jest.fn(),
  formatNotionBlock: block => block
}))
jest.mock('@/lib/utils/notion.util', () => ({
  adapterNotionBlockMap: jest.fn(raw => raw)
}))
jest.mock('@/lib/plugins/algolia', () => ({ uploadDataToAlgolia: jest.fn() }))
jest.mock('@/lib/utils/originalityProofManifest', () => ({
  isOriginalityProofAutoManifestEnabled: () => false,
  findOriginalityProofManifestRecord: () => null,
  recordOriginalityProofManifest: () => {}
}))
jest.mock('p-limit', () => () => fn => fn())
jest.mock('notion-utils', () => ({
  idToUuid: value => value,
  getTextContent: value => (value || []).map(x => x[0]).join('')
}))

const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const otherId = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const textId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const introId = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const marker = 'PAID_BODY_REGRESSION_MARKER'
const substack = 'https://recsysfrontier.substack.com/p/ai-daily-2026-10-24'
const freeAt = Date.parse('2026-10-30T16:00:00Z')
const body = (pageId = id) => ({
  block: {
    [pageId]: { value: { id: pageId, type: 'page', content: [introId, textId], properties: { title: [['AI 日报']] } } },
    [introId]: { value: { id: introId, type: 'text', parent_id: pageId, properties: { title: [['免费开头']] } } },
    [textId]: { value: { id: textId, type: 'text', parent_id: pageId, properties: { title: [[marker]] } } }
  }
})

beforeEach(() => {
  getOrSetDataWithCache.mockResolvedValue({
    NOTION_CONFIG: {},
    allPages: [
      {
        id,
        title: 'AI 日报',
        slug: 'ai-daily-2026-10-24',
        type: 'Post',
        status: 'Published',
        tags: ['AI', '日报'],
        date: { start_date: '2026-10-24' },
        summary: 'PUBLIC_SUMMARY',
        substack,
        category: 'AI'
      },
      {
        id: 'old',
        title: 'AI 日报 10-17',
        slug: 'ai-daily-2026-10-17',
        href: '/ai-daily-2026-10-17',
        type: 'Post',
        status: 'Published',
        tags: ['日报'],
        category: 'AI',
        date: { start_date: '2026-10-17' }
      },
      { id: otherId, title: '原创', slug: 'original', type: 'Post', status: 'Published', tags: ['LLM'] }
    ],
    latestPosts: [],
    tagOptions: []
  })
  fetchNotionPageBlocks.mockImplementation(pageId => Promise.resolve(body(pageId)))
})

afterEach(() => jest.restoreAllMocks())

it.each([undefined, 'any password'])(
  'serves the free preview and Substack link but not the paid body during the paywall (password: %s)',
  async password => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-25T00:00:00Z'))
    const props = await resolvePostProps({ prefix: 'ai-daily-2026-10-24', password })
    expect(props.post.paywall).toEqual({
      freeAt,
      url: substack,
      isPost: true,
      freeIssues: [{ title: 'AI 日报 10-17', href: '/ai-daily-2026-10-17', day: '2026-10-17' }]
    })
    expect(props.post.summary).toBe('PUBLIC_SUMMARY')
    // 两段里放出第一段
    expect(props.post.blockMap.block[id].value.content).toEqual([introId])
    expect(JSON.stringify(props.post.blockMap)).toContain('免费开头')
    // 字数按全文统计：4 个汉字 + 1 个英文串
    expect(props.post.wordCount).toBe(5)
    expect(props.post.readTime).toBe(1)
    expect(props.next.title).toBe('AI 日报 10-17')
    expect(JSON.stringify(props)).not.toContain(marker)
  }
)

it('still serves the locked page when the body cannot be counted', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-25T00:00:00Z'))
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  fetchNotionPageBlocks.mockRejectedValue(new Error('timeout'))
  const props = await resolvePostProps({ prefix: 'ai-daily-2026-10-24' })
  expect(props.post.paywall.url).toBe(substack)
  expect(props.post.blockMap).toBeUndefined()
  expect(props.post.wordCount).toBeUndefined()
})

it('serves the full body once the paywall ends', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(freeAt)
  const props = await resolvePostProps({ prefix: 'ai-daily-2026-10-24' })
  expect(props.post.paywall).toBeUndefined()
  expect(JSON.stringify(props.post)).toContain(marker)
})

it('keeps need_pay posts locked with no free date', async () => {
  const data = await getOrSetDataWithCache()
  const index = data.allPages.findIndex(page => page.id === otherId)
  data.allPages[index] = { ...data.allPages[index], need_pay: 'Yes', summary: 'ESSAY_SUMMARY' }
  getOrSetDataWithCache.mockResolvedValue(data)
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-01-01T00:00:00Z'))
  const props = await resolvePostProps({ prefix: 'original' })
  expect(props.post.paywall).toEqual({
    freeAt: null,
    url: 'https://recsysfrontier.substack.com/subscribe',
    isPost: false,
    freeIssues: []
  })
  expect(props.post.summary).toBe('ESSAY_SUMMARY')
  expect(JSON.stringify(props.post.blockMap)).toContain('免费开头')
  expect(JSON.stringify(props)).not.toContain(marker)
})

it('keeps the need_pay flag in post summaries used by RSS and list previews', () => {
  const summary = cleanPostSummary({ id, type: 'Post', tags: ['LLM'], need_pay: 'Yes', blockMap: {} })
  expect(summary.need_pay).toBe('Yes')
  expect(isPaywalled(summary)).toBe(true)
})
