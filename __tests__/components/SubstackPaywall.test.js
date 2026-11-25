import { render, screen } from '@testing-library/react'
import SubstackPaywall from '@/components/SubstackPaywall'
import { useRouter } from 'next/router'

jest.mock('next/router', () => ({ useRouter: jest.fn(() => ({ locale: 'zh-CN' })) }))

jest.mock('@/lib/config', () => ({
  siteConfig: (key, defaultVal) =>
    ({
      PAYWALL_BENEFITS: ['每天的日报'],
      PAYWALL_TITLE: '本期为订阅内容',
      PAYWALL_XIAOBOT_URL: 'https://xiaobot.net/p/aisignal'
    })[key] ?? defaultVal
}))

const freeAt = Date.parse('2026-10-30T16:00:00Z')

it('shows the summary, links to the Substack post and shows the Beijing free date', () => {
  const url = 'https://recsysfrontier.substack.com/p/ai-daily-2026-10-24'
  render(
    <SubstackPaywall
      post={{ summary: '本期摘要被截断在半句', paywall: { freeAt, url, isPost: true } }}
    />
  )
  expect(screen.getByText('本期摘要被截断在半句…')).toBeInTheDocument()
  expect(screen.getByText('本期为订阅内容')).toBeInTheDocument()
  expect(screen.getByText('每天的日报')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: '去 Substack 阅读全文' })
  expect(link).toHaveAttribute('href', url)
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.getByText('本期将于 10 月 31 日免费开放')).toBeInTheDocument()
  expect(screen.queryByText('往期免费阅读')).not.toBeInTheDocument()
})

it('drops the summary when part of the body is shown above the card', () => {
  render(
    <SubstackPaywall
      post={{ summary: '本期摘要', blockMap: { block: {} }, paywall: { freeAt, url: '', isPost: false } }}
    />
  )
  expect(screen.queryByText(/本期摘要/)).not.toBeInTheDocument()
  expect(screen.getByText('本期为订阅内容')).toBeInTheDocument()
})

it('links to free past issues', () => {
  const freeIssues = [{ title: 'AI 日报 10-17', href: '/article/ai-daily-2026-10-17', day: '2026-10-17' }]
  render(<SubstackPaywall post={{ paywall: { freeAt, url: '', isPost: false, freeIssues } }} />)
  expect(screen.getByText('往期免费阅读')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'AI 日报 10-17' })).toHaveAttribute(
    'href',
    '/article/ai-daily-2026-10-17'
  )
})

it('asks readers to subscribe when the post has no Substack link yet', () => {
  const url = 'https://recsysfrontier.substack.com/subscribe'
  render(<SubstackPaywall post={{ paywall: { freeAt, url, isPost: false } }} />)
  expect(screen.getByRole('link', { name: '去 Substack 订阅' })).toHaveAttribute('href', url)
})

it('uses article wording and hides the free date for need_pay posts', () => {
  render(<SubstackPaywall post={{ paywall: { freeAt: null, url: 'https://x.test', isPost: true } }} />)
  expect(screen.getByText('本文为订阅内容')).toBeInTheDocument()
  expect(screen.queryByText(/免费开放/)).not.toBeInTheDocument()
})

it('renders nothing for unlocked posts', () => {
  const { container } = render(<SubstackPaywall post={{}} />)
  expect(container).toBeEmptyDOMElement()
})

it('uses English copy and hides the Xiaobot entry on the English site', () => {
  useRouter.mockReturnValue({ locale: 'en' })
  const freeIssues = [{ title: 'AI Weekly 2026-W46', href: '/article/ai-weekly-2026-W46-en', day: '2026-11-14' }]
  const { container } = render(
    <SubstackPaywall post={{ paywall: { freeAt, url: 'https://x.test', isPost: false, freeIssues } }} />
  )
  expect(screen.getByText('This issue is for paid subscribers')).toBeInTheDocument()
  expect(screen.getByText('Free to read from Oct 31 (Beijing time)')).toBeInTheDocument()
  expect(screen.getByText('Free past issues')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Subscribe on Substack' })).toBeInTheDocument()
  expect(container.textContent).not.toMatch(/[\u4e00-\u9fff]/)
  useRouter.mockReturnValue({ locale: 'zh-CN' })
})

it('links the Xiaobot button to the post, or to the column when there is no post link', () => {
  const xiaobotUrl = 'https://xiaobot.net/post/abc'
  const paywall = { freeAt, url: 'https://x.test', isPost: true }
  const { unmount } = render(<SubstackPaywall post={{ paywall: { ...paywall, xiaobotUrl } }} />)
  expect(screen.getByRole('link', { name: '去小报童阅读全文' })).toHaveAttribute('href', xiaobotUrl)
  unmount()
  render(<SubstackPaywall post={{ paywall: { ...paywall, xiaobotUrl: '' } }} />)
  expect(screen.getByRole('link', { name: '去小报童阅读全文' })).toHaveAttribute('href', 'https://xiaobot.net/p/aisignal')
})
