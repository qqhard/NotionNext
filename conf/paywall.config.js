/**
 * 付费锁定（本 fork 新增）
 * 带指定标签的文章发布后各自的天数内（日报 3 天、周报 7 天，英文版标签 Daily / Weekly 同样），博客只显示标题、开头一部分正文和 Substack 引流卡片，
 * 第 N+1 天北京时间 0 点起自动免费。手动勾选 need_pay 的文章一直锁定。其余正文不会出现在页面、接口中，RSS 和搜索只有摘要。
 */
module.exports = {
  // 总开关，Substack 同步上线后再打开
  PAYWALL_ENABLE: process.env.NEXT_PUBLIC_PAYWALL_ENABLE || false,
  // 需要锁定的标签和各自的锁定天数，「标签:天数」逗号分隔，天数从 Notion date 当天（北京时间）算起
  PAYWALL_TAGS: process.env.NEXT_PUBLIC_PAYWALL_TAGS || '日报:3,周报:7,Daily:3,Weekly:7',
  // 标签没写天数时的锁定天数
  PAYWALL_DAYS: process.env.NEXT_PUBLIC_PAYWALL_DAYS || 7,
  // Substack 刊物地址；文章还没有对应的 Substack 链接时，按钮跳到它的订阅页
  PAYWALL_SUBSTACK_URL:
    process.env.NEXT_PUBLIC_PAYWALL_SUBSTACK_URL ||
    'https://recsysfrontier.substack.com',
  // Notion 数据库里记录 Substack 文章链接的列名（URL 类型）
  PAYWALL_SUBSTACK_PROPERTY:
    process.env.NEXT_PUBLIC_PAYWALL_SUBSTACK_PROPERTY || 'substack',

  // Notion 数据库里手动锁定的复选框列名，勾选后一直锁定直到取消勾选
  PAYWALL_MANUAL_PROPERTY:
    process.env.NEXT_PUBLIC_PAYWALL_MANUAL_PROPERTY || 'need_pay',
  // 锁定文章放出的正文：在 Notion 里单独写一行分隔符，它之前的内容公开、之后的锁定
  PAYWALL_MARKER: process.env.NEXT_PUBLIC_PAYWALL_MARKER || '[paywall]',
  // 没有分隔符时放出的顶层段落比例（向上取整，至少 1 段，不放出全文）
  PAYWALL_PREVIEW_RATIO: process.env.NEXT_PUBLIC_PAYWALL_PREVIEW_RATIO || 0.2,
  // 卡片下方展示的同系列已免费往期条数，0 表示不展示
  PAYWALL_FREE_ISSUES: process.env.NEXT_PUBLIC_PAYWALL_FREE_ISSUES || 3,

  // 卡片文案
  PAYWALL_TITLE: '本期为订阅内容',
  PAYWALL_MANUAL_TITLE: '本文为订阅内容',
  // 与 Substack 付费权益（publication.paid_subscription_benefits）对齐；作者 2026-11-22 定：不提「九老师」
  PAYWALL_BENEFITS: [
    '长文、日报、周报发布当天读全文（免费读者要等 3–8 天）',
    '全部历史文章随时可读，包括付费专区 Premium',
    '加入付费读者群（Substack Chat），一起讨论技术问题',
    '私信咨询职业发展问题'
  ],
  PAYWALL_BUTTON_TEXT: '去 Substack 阅读全文',
  PAYWALL_SUBSCRIBE_TEXT: '去 Substack 订阅',
  // 国内读者翻不了墙：Substack 按钮下方再放小报童专栏（内容与 Substack 同步），留空则不显示
  PAYWALL_XIAOBOT_URL:
    process.env.NEXT_PUBLIC_PAYWALL_XIAOBOT_URL || 'https://xiaobot.net/p/aisignal',
  PAYWALL_XIAOBOT_TEXT: '去小报童阅读全文',
  PAYWALL_XIAOBOT_HINT: '国内读者打不开 Substack？',

  // 英文站（locale 以 en 开头）的卡片文案，与上面中文一一对应；英文站不放小报童入口
  PAYWALL_TITLE_EN: 'This issue is for paid subscribers',
  PAYWALL_MANUAL_TITLE_EN: 'This article is for paid subscribers',
  PAYWALL_BENEFITS_EN: [
    'Read essays, dailies and weeklies the day they come out (free readers wait 3–8 days)',
    'Full archive anytime, including the paid-only Premium section',
    'Join the paid-subscriber chat on Substack to discuss technical questions',
    'Ask career questions by direct message'
  ],
  PAYWALL_BUTTON_TEXT_EN: 'Read the full issue on Substack',
  PAYWALL_SUBSCRIBE_TEXT_EN: 'Subscribe on Substack'
}
