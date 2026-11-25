import { resolvePostProps } from '@/lib/db/SiteDataApi'
import { getPostRevalidate } from '@/lib/utils/revalidate'
import Slug from '..'
import { getStaticPathsBase } from '@/lib/build/staticPaths'
import { isExport } from '@/lib/utils/buildMode'
import { checkSlugHasOneSlash } from '@/lib/utils/post'

const isStaticExport = process.env.EXPORT === 'true'

/**
 * 根据notion的slug访问页面
 * 解析二级目录 /article/about
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

export async function getStaticPaths() {
  return getStaticPathsBase({
    from: 'slug-paths',
    filterFn: row => checkSlugHasOneSlash(row),
    mapPageToParams: row => ({
      params: {
        prefix: row.slug.split('/')[0],
        slug: row.slug.split('/')[1]
      }
    })
  })
}

export async function getStaticProps({ params: { prefix, slug }, locale, revalidateReason }) {
  const props = await resolvePostProps({
    prefix,
    slug,
    locale,
    revalidateReason,
  })

  return {
    props,
    revalidate: isStaticExport
      ? undefined
      : getPostRevalidate(props),
    notFound: !props.post
  }
}

export default PrefixSlug
