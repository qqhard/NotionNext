/**
 * 付费锁定（本 fork 新增）
 * 带指定标签的文章发布后 N 天内，博客只显示标题、摘要和 Substack 引流卡片，
 * 第 N+1 天北京时间 0 点起自动免费。手动勾选 need_pay 的文章一直锁定。正文不会出现在页面、接口、RSS 和搜索中。
 */
module.exports = {
  // 总开关，Substack 同步上线后再打开
  PAYWALL_ENABLE: process.env.NEXT_PUBLIC_PAYWALL_ENABLE || false,
  // 需要锁定的标签，逗号分隔
  PAYWALL_TAGS: process.env.NEXT_PUBLIC_PAYWALL_TAGS || '日报,周报',
  // 锁定天数，从 Notion date 当天（北京时间）算起
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
  // 卡片下方展示的同系列已免费往期条数，0 表示不展示
  PAYWALL_FREE_ISSUES: process.env.NEXT_PUBLIC_PAYWALL_FREE_ISSUES || 3,

  // 卡片文案
  PAYWALL_TITLE: '本期为订阅内容',
  PAYWALL_MANUAL_TITLE: '本文为订阅内容',
  PAYWALL_BENEFITS: [
    '每天的 AI / 推荐系统前沿日报，第一时间读到',
    '每周周报，一周重点一次看完',
    '订阅期内所有日报周报全文'
  ],
  PAYWALL_BUTTON_TEXT: '去 Substack 阅读全文',
  PAYWALL_SUBSCRIBE_TEXT: '去 Substack 订阅'
}
