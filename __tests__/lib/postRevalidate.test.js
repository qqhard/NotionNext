jest.mock('@/lib/config', () => ({ siteConfig: () => 86400 }))
jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: {
    NEXT_REVALIDATE_SECOND: 86400,
    NEXT_REVALIDATE_OLD_POST_DAYS: 7,
    NEXT_REVALIDATE_OLD_POST_SECOND: 604800
  }
}))
import { getPostRevalidate } from '@/lib/utils/revalidate'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 10, 25)
const run = post => getPostRevalidate({ post }, now)
const old = { type: 'Post', publishDate: now - 30 * DAY }

describe('getPostRevalidate', () => {
  test('7 天以上的文章缓存 7 天', () => {
    expect(run(old)).toBe(604800)
    expect(run({ ...old, publishDate: now - 7 * DAY })).toBe(604800)
  })
  test('近 7 天的文章沿用默认', () => {
    expect(run({ ...old, publishDate: now - 6 * DAY })).toBe(86400)
  })
  test('锁定、密码、独立页面、无日期、404 沿用默认', () => {
    expect(run({ ...old, paywall: { freeAt: null } })).toBe(86400)
    expect(run({ ...old, password: 'protected' })).toBe(86400)
    expect(run({ ...old, type: 'Page' })).toBe(86400)
    expect(run({ ...old, publishDate: undefined })).toBe(86400)
    expect(run(null)).toBe(86400)
  })
})
