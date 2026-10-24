import { siteConfig } from '@/lib/config'

const DAY_MS = 24 * 60 * 60 * 1000
// 北京时间固定 UTC+8，没有夏令时
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

const getTags = () =>
  String(siteConfig('PAYWALL_TAGS', '日报,周报') || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)

/** Notion date 的日期部分；没有填写时按北京时间取发布时间所在的那一天。 */
function getPublishDay(post) {
  const startDate = post?.date?.start_date
  if (/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')) return startDate
  if (!Number.isFinite(post?.publishDate)) return null
  return new Date(post.publishDate + BEIJING_OFFSET_MS).toISOString().slice(0, 10)
}

function getSubstackUrl(post) {
  const base = String(siteConfig('PAYWALL_SUBSTACK_URL', '') || '').replace(/\/+$/, '')
  const property = siteConfig('PAYWALL_SUBSTACK_PROPERTY', 'substack')
  const postUrl = String(post?.[property] || '').trim()
  if (/^https:\/\/[^\s]+$/i.test(postUrl)) return { url: postUrl, isPost: true }
  return { url: base ? `${base}/subscribe` : '', isPost: false }
}

/**
 * 文章当前是否处于付费锁定期
 * @returns {null|{freeAt:number,url:string,isPost:boolean}} 未锁定时返回 null
 */
export function getPaywall(post, now = Date.now()) {
  if (!siteConfig('PAYWALL_ENABLE', false)) return null
  if (!post || post.type !== 'Post') return null
  const tags = getTags()
  if (!Array.isArray(post.tags) || !post.tags.some(tag => tags.includes(tag)))
    return null
  const day = getPublishDay(post)
  if (!day) return null
  const days = Number(siteConfig('PAYWALL_DAYS', 7))
  const freeAt =
    Date.parse(`${day}T00:00:00Z`) - BEIJING_OFFSET_MS + days * DAY_MS
  if (!Number.isFinite(freeAt) || now >= freeAt) return null
  return { freeAt, ...getSubstackUrl(post) }
}

export const isPaywalled = (post, now) => Boolean(getPaywall(post, now))

/** 免费开放日（北京时间）的月、日 */
export function getFreeDay(freeAt) {
  const date = new Date(freeAt + BEIJING_OFFSET_MS)
  return { month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}
