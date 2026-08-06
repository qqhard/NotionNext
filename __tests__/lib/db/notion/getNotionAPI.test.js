/**
 * 回归测试：Notion 的 /api/v3 前置了 Cloudflare 机器人防护。
 *
 * Node 内置 fetch(undici) 在未显式设置 User-Agent 时会自动补上 `User-Agent: node`，
 * 该 UA 会被 Cloudflare 拦截并返回 403 拦截页（HTML，非 JSON），
 * 表现为 `FetchError: [POST] ".../loadPageChunk": 403 Forbidden`。
 *
 * 因此构造 NotionAPI 时必须：
 *   1. 使用 `ofetchOptions`（notion-client 已从 ky 迁移到 ofetch，`kyOptions` 会被忽略）
 *   2. 在 headers 中显式指定一个浏览器 User-Agent
 */

const ctorOptions = []

jest.mock('notion-client', () => ({
  NotionAPI: function NotionAPI(options) {
    ctorOptions.push(options)
    this.getPage = jest.fn().mockResolvedValue({ block: {} })
  }
}))

describe('getNotionAPI 的 Cloudflare UA 绕过配置', () => {
  let notionAPI

  beforeAll(async () => {
    ctorOptions.length = 0
    notionAPI = (await import('@/lib/db/notion/getNotionAPI')).default
    // 客户端是懒构造的，需触发一次调用
    await notionAPI.getPage('2ca0131b-d915-818d-895f-d3eab41a9286')
  })

  const getOptions = () => {
    expect(ctorOptions).toHaveLength(1)
    return ctorOptions[0]
  }

  it('请求配置放在 ofetchOptions 下（kyOptions 会被 notion-client 静默忽略）', () => {
    const options = getOptions()
    expect(options.ofetchOptions).toBeDefined()
    // kyOptions 目前作为「记录原始意图的死代码」保留，但不允许承载 UA 这类必需配置
    expect(options.kyOptions?.headers).toBeUndefined()
  })

  it('显式设置了浏览器 User-Agent，避免 undici 默认的 "node" 被 Cloudflare 拦截', () => {
    const headers = getOptions().ofetchOptions?.headers || {}
    const ua = headers['User-Agent'] || headers['user-agent']

    expect(ua).toBeTruthy()
    expect(ua).toMatch(/Mozilla\/5\.0/)
    expect(ua).not.toBe('node')
  })
})
