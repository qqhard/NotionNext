/** 不使用全站文章列表的主题；换成别的主题时列表自动恢复完整 */
const THEMES_WITHOUT_NAV_LIST = ['next']

/** 列表只留链接（右键菜单「随机文章」用 slug），去掉标题、摘要、标签等 */
export function slimNavPages(pages, theme) {
  if (!Array.isArray(pages) || !THEMES_WITHOUT_NAV_LIST.includes(theme)) return pages
  return pages.map(({ slug }) => ({ slug }))
}

/** 正文内链对照表（convertInnerUrl）只用短 ID 和地址，与主题无关 */
export function slimLinkPages(pages) {
  if (!Array.isArray(pages)) return pages
  return pages.map(({ short_id, href }) => ({ short_id, href }))
}
