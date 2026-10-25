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

/** 手动锁定列名。文章摘要（列表、RSS 用）要保留这一列，否则在那里判断不出锁定 */
export const getManualLockProperty = () =>
  siteConfig('PAYWALL_MANUAL_PROPERTY', 'need_pay')

/** Notion 复选框列被勾选（文本为 Yes） */
function isManuallyLocked(post) {
  const value = post?.[getManualLockProperty()]
  return value === true || /^(yes|true)$/i.test(String(value ?? '').trim())
}

/**
 * 文章当前是否处于付费锁定期
 * 手动勾选的文章一直锁定（freeAt 为 null）；日报周报按发布日期锁定 N 天
 * @returns {null|{freeAt:number|null,url:string,isPost:boolean}} 未锁定时返回 null
 */
export function getPaywall(post, now = Date.now()) {
  if (!siteConfig('PAYWALL_ENABLE', false)) return null
  if (!post || !['Post', 'Page'].includes(post.type)) return null
  if (isManuallyLocked(post)) return { freeAt: null, ...getSubstackUrl(post) }
  if (post.type !== 'Post') return null
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

/**
 * 同系列（同分类、同为日报或周报）已经免费开放的往期，按日期从新到旧
 * @returns {{title:string,href:string,day:string}[]}
 */
export function getFreeIssues(post, allPages, now = Date.now()) {
  const count = Number(siteConfig('PAYWALL_FREE_ISSUES', 3))
  if (!post || !Array.isArray(allPages) || !(count > 0)) return []
  if (isManuallyLocked(post)) return []
  const tags = getTags().filter(tag => post.tags?.includes(tag))
  return allPages
    .filter(
      page =>
        page?.id !== post.id &&
        page?.type === 'Post' &&
        page.status === 'Published' &&
        !page.password &&
        page.href &&
        page.category === post.category &&
        page.tags?.some(tag => tags.includes(tag)) &&
        getPublishDay(page) &&
        !isPaywalled(page, now)
    )
    .map(page => ({ title: page.title, href: page.href, day: getPublishDay(page) }))
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, count)
}
