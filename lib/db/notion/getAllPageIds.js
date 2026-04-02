import BLOG from "@/blog.config"

export default function getAllPageIds(collectionQuery, collectionId, collectionView, viewIds, block = {}) {
  const pageSet = new Set()

  // ── 策略1：从 collectionView page_sort 取（Notion 视图的真实排序）──
  if (collectionView && viewIds?.length > 0) {
    const groupIndex = BLOG.NOTION_INDEX || 0
    const targetViewId = viewIds[groupIndex]
    const pageSort = collectionView?.[targetViewId]?.value?.value?.page_sort

    if (Array.isArray(pageSort) && pageSort.length > 0) {
      pageSort.forEach(id => pageSet.add(id))
      // console.log('[getAllPageIds] page_sort 数量:', pageSet.size)
    }
  }

  // ── 策略2：遍历所有 viewId 的 page_sort 兜底 ──
  if (pageSet.size === 0 && collectionView) {
    Object.values(collectionView).forEach(viewEntry => {
      const pageSort = viewEntry?.value?.value?.page_sort
      if (Array.isArray(pageSort)) {
        pageSort.forEach(id => pageSet.add(id))
      }
    })
    pageSortCount = pageSet.size
  }

  // ── 策略3：从 collectionQuery 补充遗漏 ──
  if (collectionQuery && collectionId) {
    const viewQuery = collectionQuery?.[collectionId]
    if (viewQuery) {
      Object.values(viewQuery).forEach(viewData => {
        [
          viewData?.collection_group_results?.blockIds,
          viewData?.results?.blockIds,
          viewData?.blockIds,
        ].forEach(ids => {
          if (Array.isArray(ids)) ids.forEach(id => pageSet.add(id))
        })
      })
    }
  }

  if (pageSet.size === 0) {
    return []
  }

  return [...pageSet]
}
