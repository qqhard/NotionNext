import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 文章页的 ISR 缓存时间（秒）
 * 发布超过 NEXT_REVALIDATE_OLD_POST_DAYS 天的文章用更长的 NEXT_REVALIDATE_OLD_POST_SECOND；
 * 新文章、付费锁定中的文章、独立页面、404 沿用 NEXT_REVALIDATE_SECOND
 */
export function getPostRevalidate(props, now = Date.now()) {
  const base = siteConfig(
    'NEXT_REVALIDATE_SECOND',
    BLOG.NEXT_REVALIDATE_SECOND,
    props?.NOTION_CONFIG
  )
  const post = props?.post
  if (!post || post.type !== 'Post' || post.paywall) return base
  // 密码页、没有发布日期的文章不动
  if (post.password || !Number.isFinite(post.publishDate)) return base

  const days = Number(BLOG.NEXT_REVALIDATE_OLD_POST_DAYS)
  const longer = Number(BLOG.NEXT_REVALIDATE_OLD_POST_SECOND)
  if (!(days > 0) || !(longer > 0)) return base
  if (now - post.publishDate < days * DAY_MS) return base
  return Math.max(Number(base) || 0, longer)
}
