import { render, screen } from '@testing-library/react'
import SubstackPaywall from '@/components/SubstackPaywall'

jest.mock('@/lib/config', () => ({
  siteConfig: (key, defaultVal) =>
    ({
      PAYWALL_BENEFITS: ['每天的日报'],
      PAYWALL_TITLE: '本期为订阅内容'
    })[key] ?? defaultVal
}))

const freeAt = Date.parse('2026-10-30T16:00:00Z')

it('links to the Substack post and shows the Beijing free date', () => {
  const url = 'https://recsysfrontier.substack.com/p/ai-daily-2026-10-24'
  render(<SubstackPaywall post={{ paywall: { freeAt, url, isPost: true } }} />)
  expect(screen.getByText('🔒 本期为订阅内容')).toBeInTheDocument()
  expect(screen.getByText('每天的日报')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: '去 Substack 阅读全文' })
  expect(link).toHaveAttribute('href', url)
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.getByText('本期将于 10 月 31 日免费开放')).toBeInTheDocument()
})

it('asks readers to subscribe when the post has no Substack link yet', () => {
  const url = 'https://recsysfrontier.substack.com/subscribe'
  render(<SubstackPaywall post={{ paywall: { freeAt, url, isPost: false } }} />)
  expect(screen.getByRole('link', { name: '去 Substack 订阅' })).toHaveAttribute('href', url)
})

it('renders nothing for unlocked posts', () => {
  const { container } = render(<SubstackPaywall post={{}} />)
  expect(container).toBeEmptyDOMElement()
})
