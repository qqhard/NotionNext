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

const HEADINGS = ['header', 'sub_header', 'sub_sub_header']

const blockText = value =>
  (value?.properties?.title || []).map(segment => segment?.[0] ?? '').join('').trim()

/**
 * 锁定文章放出的正文：顶层段落里遇到只写着分隔符的一段就在那里截断（分隔符本身不显示），
 * 没有分隔符时放出前 PAYWALL_PREVIEW_RATIO 的顶层块，至少 1 块但不放出全文，末尾的标题去掉
 * @returns {object} 只含放出部分的 blockMap 副本，不改动传入的 blockMap
 */
export function getPaywallPreview(post, blockMap) {
  const blocks = blockMap?.block || {}
  const rootId = Object.keys(blocks).find(
    key => key.replace(/-/g, '') === String(post?.id || '').replace(/-/g, '')
  )
  const root = blocks[rootId]?.value
  const content = Array.isArray(root?.content) ? root.content : []
  const marker = String(siteConfig('PAYWALL_MARKER', '[paywall]')).trim()
  const markerIndex = content.findIndex(
    id => blocks[id]?.value?.type === 'text' && blockText(blocks[id].value) === marker
  )
  const ratio = Number(siteConfig('PAYWALL_PREVIEW_RATIO', 0.2))
  const count =
    markerIndex >= 0
      ? markerIndex
      : Math.min(Math.max(1, Math.ceil(content.length * ratio)), content.length - 1)
  const shown = content.slice(0, Math.max(0, count))
  // 按比例截断时不以孤零零的标题结尾
  while (
    markerIndex < 0 &&
    shown.length > 1 &&
    HEADINGS.includes(blocks[shown[shown.length - 1]]?.value?.type)
  )
    shown.pop()

  // 放出块的子孙一并保留；子页面只显示为链接，不带它的内容
  const keep = new Set([rootId])
  const queue = [...shown]
  while (queue.length) {
    const id = queue.shift()
    if (keep.has(id) || !blocks[id]) continue
    keep.add(id)
    const value = blocks[id].value
    if (value?.type !== 'page' && Array.isArray(value?.content)) queue.push(...value.content)
  }

  const pick = map =>
    Object.fromEntries(Object.entries(map || {}).filter(([id]) => keep.has(id)))
  const preview = JSON.parse(JSON.stringify({ ...blockMap, block: pick(blocks) }))
  if (rootId) preview.block[rootId].value.content = shown
  if (blockMap?.signed_urls) preview.signed_urls = pick(preview.signed_urls)
  return preview
}

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
