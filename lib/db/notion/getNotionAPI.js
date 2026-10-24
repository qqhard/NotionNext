import { NotionAPI as NotionLibrary } from 'notion-client'
import BLOG from '@/blog.config'
import path from 'path'
import { RateLimiter } from './RateLimiter'
import {
  getNotionBuildRateMaxPerMinute,
  getNotionBuildRateMinIntervalMs,
  logBuildEnvSummary
} from '@/lib/build/buildEnv'

// 限流配置，打包编译阶段避免接口频繁，限制频率
const useRateLimiter = process.env.BUILD_MODE || process.env.EXPORT
const lockFilePath = path.resolve(process.cwd(), '.notion-api-lock')
const rateLimiter = new RateLimiter(
  getNotionBuildRateMaxPerMinute(),
  lockFilePath,
  getNotionBuildRateMinIntervalMs()
)
if (useRateLimiter) {
  logBuildEnvSummary()
}

const globalStore = { notion: null, inflight: new Map() }

// Notion 的 /api/v3 前置了 Cloudflare 机器人防护。
// notion-client 自身不设置 User-Agent，Node 内置 fetch(undici) 会自动补上
// `User-Agent: node`，该 UA 被 Cloudflare 拦截并返回 403 HTML 拦截页，
// 表现为 `FetchError: [POST] ".../loadPageChunk": 403 Forbidden`。
// 因此必须显式伪装成浏览器 UA。可用 NOTION_USER_AGENT 覆盖以便 Cloudflare 规则再收紧时无需改代码。
const NOTION_USER_AGENT =
  process.env.NOTION_USER_AGENT ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function getRawNotion() {
  if (!globalStore.notion) {
    globalStore.notion = new NotionLibrary({
      apiBaseUrl: BLOG.API_BASE_URL || 'https://app.notion.com/api/v3',
      activeUser: BLOG.NOTION_ACTIVE_USER || null,
      authToken: BLOG.NOTION_TOKEN_V2 || null,
      userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      // 注意：选项名必须是 ofetchOptions —— notion-client 已从 ky 迁移到 ofetch，
      // 传 kyOptions 会被静默忽略。headers 会在 notion-client 内部合并进每次请求，
      // 所以 getPage / getBlocks / getUsers / getSignedFileUrls 全部覆盖。
      ofetchOptions: {
        headers: {
          'User-Agent': NOTION_USER_AGENT
        }
      },
      // TODO(待确认): 以下 kyOptions 从未生效过 —— 选项名错误(应为 ofetchOptions)，
      // 且 hooks.beforeRequest 是 ky 的 API，ofetch 用的是 onRequest。
      // 也就是说这个 syncRecordValues -> syncRecordValuesMain 的重写一直是死代码。
      // 保留在此以记录原始意图；是否要真正启用需先验证，贸然启用会改变线上行为。
      kyOptions: {
        mode: 'cors',
        hooks: {
          beforeRequest: [
            (request) => {
              const url = request.url.toString()
              if (url.includes('/api/v3/syncRecordValues')) {
                return new Request(
                  url.replace('/api/v3/syncRecordValues', '/api/v3/syncRecordValuesMain'),
                  request
                )
              }
              return request
            }
          ]
        }
      }
    })
  }
  return globalStore.notion
}

async function callNotion(methodName, ...args) {
  const notion = getRawNotion()
  const original = notion[methodName]
  if (typeof original !== 'function') throw new Error(`${methodName} is not a function`)

  const key = `${methodName}-${JSON.stringify(args)}`

  if (globalStore.inflight.has(key)) return globalStore.inflight.get(key)

  // 注意：原函数已返回 Promise，不需要再 async 包一层
  const execute = () => original.apply(notion, args)
  const promise = useRateLimiter
    ? rateLimiter.enqueue(key, execute)
    : Promise.resolve().then(execute)

  globalStore.inflight.set(key, promise)
  // 始终把 inflight 清掉；即便上层不消费 reject 也不抛 unhandledRejection
  promise
    .catch(() => {})
    .finally(() => globalStore.inflight.delete(key))
  return promise
}

export const notionAPI = {
  getPage: (...args) => callNotion('getPage', ...args),
  getBlocks: (...args) => callNotion('getBlocks', ...args),
  getSignedFileUrls: (...args) => callNotion('getSignedFileUrls', ...args),
  getUsers: (...args) => callNotion('getUsers', ...args),
  __call: callNotion
}

export default notionAPI
