import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { getFreeDay } from '@/lib/utils/paywall'

// 日报摘要在写入 Notion 时被截断，结尾不是标点时补省略号
const withEllipsis = text =>
  /[。！？…；.!?;」”）)]$/.test(text.trim()) ? text : `${text.trim()}…`

/**
 * 付费锁定期内代替正文：摘要 + 订阅卡片（权益、跳转 Substack、免费开放日期、已免费往期）
 */
export default function SubstackPaywall({ post }) {
  const paywall = post?.paywall
  if (!paywall) return null
  const benefits = siteConfig('PAYWALL_BENEFITS', [])
  const { month, day } = getFreeDay(paywall.freeAt)
  const buttonText = paywall.isPost
    ? siteConfig('PAYWALL_BUTTON_TEXT', '去 Substack 阅读全文')
    : siteConfig('PAYWALL_SUBSCRIBE_TEXT', '去 Substack 订阅')

  return (
    <div id='substack-paywall' className='my-6'>
      {post.summary && (
        <p className='text-base leading-8 text-gray-700 dark:text-gray-300'>
          {withEllipsis(post.summary)}
        </p>
      )}

      <section className='mt-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-white px-6 py-8 text-center shadow-sm dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 md:px-10'>
        <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6719]/10 text-[#FF6719]'>
          <i className='fas fa-lock text-lg' />
        </div>
        <h2 className='mb-2 text-xl font-bold text-gray-900 dark:text-gray-100'>
          {siteConfig('PAYWALL_TITLE', '本期为订阅内容')}
        </h2>
        <p className='mb-6 text-sm text-gray-500 dark:text-gray-400'>
          订阅 RecsysFrontier，在 Substack 阅读本期全文
        </p>

        {Array.isArray(benefits) && benefits.length > 0 && (
          <ul className='mx-auto mb-8 inline-flex flex-col gap-3 text-left text-sm text-gray-700 dark:text-gray-300'>
            {benefits.map(benefit => (
              <li key={benefit} className='flex items-start gap-3'>
                <i className='fas fa-check mt-1 text-xs text-[#FF6719]' />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        )}

        {paywall.url && (
          <div>
            <a
              href={paywall.url}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 rounded-full bg-[#FF6719] px-8 py-3 text-base font-semibold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#E85A0C] hover:shadow-lg dark:shadow-none'>
              {buttonText}
              <i className='fas fa-arrow-right text-sm' />
            </a>
          </div>
        )}

        <p className='mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400'>
          <i className='far fa-clock' />
          本期将于 {month} 月 {day} 日免费开放
        </p>

        {paywall.freeIssues?.length > 0 && (
          <div className='mx-auto mt-8 max-w-md border-t border-orange-100 pt-6 text-left dark:border-gray-700'>
            <p className='mb-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300'>
              往期免费阅读
            </p>
            <ul className='flex flex-col gap-1'>
              {paywall.freeIssues.map(issue => (
                <li key={issue.href}>
                  <SmartLink
                    href={issue.href}
                    className='group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-orange-50 dark:text-gray-300 dark:hover:bg-gray-700'>
                    <span className='flex-1 truncate group-hover:text-[#FF6719]'>
                      {issue.title}
                    </span>
                    <i className='fas fa-angle-right text-xs text-gray-400 group-hover:text-[#FF6719]' />
                  </SmartLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
