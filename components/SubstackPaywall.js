import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { getFreeDay } from '@/lib/utils/paywall'
import { useRouter } from 'next/router'

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 日报摘要在写入 Notion 时被截断，结尾不是标点时补省略号
const withEllipsis = text =>
  /[。！？…；.!?;」”）)]$/.test(text.trim()) ? text : `${text.trim()}…`

/**
 * 付费锁定期内放在放出的正文下方：订阅卡片（权益、跳转 Substack、免费开放日期、已免费往期）
 * 没有放出正文时（拉取失败或全文太短）先显示摘要
 * 文案跟随站点语言：英文站用 PAYWALL_*_EN，且不放小报童入口
 */
export default function SubstackPaywall({ post }) {
  const en = /^en/i.test(useRouter()?.locale || '')
  const paywall = post?.paywall
  if (!paywall) return null
  const text = (key, zh, enText) =>
    en ? siteConfig(`${key}_EN`, enText) : siteConfig(key, zh)
  const benefits = text('PAYWALL_BENEFITS', [], [])
  const freeDay = paywall.freeAt ? getFreeDay(paywall.freeAt) : null
  const buttonText = paywall.isPost
    ? text('PAYWALL_BUTTON_TEXT', '去 Substack 阅读全文', 'Read the full issue on Substack')
    : text('PAYWALL_SUBSCRIBE_TEXT', '去 Substack 订阅', 'Subscribe on Substack')
  const xiaobotUrl = en ? '' : paywall.xiaobotUrl || siteConfig('PAYWALL_XIAOBOT_URL', '')

  return (
    <div id='substack-paywall' className='my-6'>
      {!post.blockMap && post.summary && (
        <p className='text-base leading-8 text-gray-700 dark:text-gray-300'>
          {withEllipsis(post.summary)}
        </p>
      )}

      <section className='mt-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-white px-6 py-8 text-center shadow-sm dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 md:px-10'>
        <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6719]/10 text-[#FF6719]'>
          <i className='fas fa-lock text-lg' />
        </div>
        <h2 className='mb-2 text-xl font-bold text-gray-900 dark:text-gray-100'>
          {freeDay
            ? text('PAYWALL_TITLE', '本期为订阅内容', 'This issue is for paid subscribers')
            : text('PAYWALL_MANUAL_TITLE', '本文为订阅内容', 'This article is for paid subscribers')}
        </h2>
        <p className='mb-6 text-sm text-gray-500 dark:text-gray-400'>
          {en
            ? `Subscribe to RecsysFrontier to read the full ${freeDay ? 'issue' : 'article'}`
            : `订阅 RecsysFrontier 阅读${freeDay ? '本期' : '本文'}全文`}
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

        {xiaobotUrl && (
          <div className='mt-4'>
            <p className='mb-2 text-xs text-gray-400'>
              {siteConfig('PAYWALL_XIAOBOT_HINT', '国内读者打不开 Substack？')}
            </p>
            <a
              href={xiaobotUrl}
              // 描边色用内联样式：border-[#…] 任意值类在本主题的 Tailwind 构建里不生效，会退回灰色
              style={{ borderColor: '#B14B43' }}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 rounded-full border border-[#B14B43] bg-white px-8 py-3 text-base font-semibold text-[#B14B43] transition hover:-translate-y-0.5 hover:bg-red-50 dark:bg-transparent dark:hover:bg-gray-700'>
              {siteConfig('PAYWALL_XIAOBOT_TEXT', '去小报童阅读全文')}
              <i className='fas fa-arrow-right text-sm' />
            </a>
          </div>
        )}

        {freeDay && (
          <p className='mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400'>
            <i className='far fa-clock' />
            {en
              ? `Free to read from ${MONTHS_EN[freeDay.month - 1]} ${freeDay.day} (Beijing time)`
              : `本期将于 ${freeDay.month} 月 ${freeDay.day} 日免费开放`}
          </p>
        )}

        {paywall.freeIssues?.length > 0 && (
          <div className='mx-auto mt-8 max-w-md border-t border-orange-100 pt-6 text-left dark:border-gray-700'>
            <p className='mb-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300'>
              {en ? 'Free past issues' : '往期免费阅读'}
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
