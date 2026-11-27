import { siteConfig } from '@/lib/config'

/**
 * 日报、周报这类自动汇总的文章不进搜索索引，也不进 sitemap。
 * 页面照常可以访问，只是不让搜索引擎和 AdSense 审核把它们当成站点主体内容。
 */
const getNoindexTags = () =>
  String(siteConfig('NOINDEX_TAGS', '日报,周报,Daily,Weekly') || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)

export function isNoindexPost(post) {
  const tags = post?.tags
  if (!Array.isArray(tags) || tags.length === 0) return false
  const noindexTags = getNoindexTags()
  return tags.some(tag => noindexTags.includes(tag))
}
