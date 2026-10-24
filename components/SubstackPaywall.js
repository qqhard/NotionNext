import { siteConfig } from '@/lib/config'
import { getFreeDay } from '@/lib/utils/paywall'

/**
 * 付费锁定期内代替正文的卡片：订阅权益 + 跳转 Substack + 免费开放日期
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
    <section
      id='substack-paywall'
      className='my-8 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800'>
      <h2 className='mb-3 text-lg font-bold dark:text-gray-100'>
        🔒 {siteConfig('PAYWALL_TITLE', '本期为订阅内容')}
      </h2>
      {Array.isArray(benefits) && benefits.length > 0 && (
        <ul className='mb-5 list-disc space-y-1 pl-5 text-sm leading-7 text-gray-600 dark:text-gray-300'>
          {benefits.map(benefit => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      )}
      {paywall.url && (
        <a
          href={paywall.url}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-block rounded-md bg-[#276077] px-4 py-2 text-sm text-white hover:opacity-90'>
          {buttonText}
        </a>
      )}
      <p className='mt-4 text-xs text-gray-500 dark:text-gray-400'>
        本期将于 {month} 月 {day} 日免费开放
      </p>
    </section>
  )
}
