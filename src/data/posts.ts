export type Locale = 'zh' | 'en'

export type PostBlock =
  | { type: 'heading'; text: Record<Locale, string> }
  | { type: 'paragraph'; text: Record<Locale, string> }
  | { type: 'quote'; text: Record<Locale, string> }
  | { type: 'code'; language: string; code: string }

export interface Post {
  slug: string
  date: string
  readingTime: number
  category: Record<Locale, string>
  tags: Record<Locale, string[]>
  title: Record<Locale, string>
  excerpt: Record<Locale, string>
  content: Record<Locale, PostBlock[]>
}

export const posts: Post[] = [
  {
    slug: 'designing-a-calm-ai-workflow', date: '2026-08-31', readingTime: 5,
    category: { zh: '人工智能', en: 'Artificial Intelligence' }, tags: { zh: ['AI', '效率'], en: ['AI', 'Productivity'] },
    title: { zh: '为 AI 工作流保留一点安静的空间', en: 'Making room for calm in an AI workflow' },
    excerpt: { zh: '先从整理输入、减少切换和建立可复用的上下文开始，让工具真正服务于思考。', en: 'Start by organizing inputs, reducing context switching, and building reusable context so tools can serve the thinking.' },
    content: {
      zh: [
        { type: 'paragraph', text: { zh: 'AI 工具越来越擅长给出答案，但一个好的工作流不应该只追求更快地产生结果。真正重要的是，我们是否还保留了理解问题、判断取舍和重新组织答案的空间。', en: '' } },
        { type: 'heading', text: { zh: '先整理输入，再开始对话', en: 'Organize the input before starting the conversation' } },
        { type: 'paragraph', text: { zh: '我会把任务拆成背景、目标、限制和交付格式四部分。这样做并不是为了写出一条完美提示词，而是为了让自己先弄清楚到底在解决什么问题。', en: '' } },
        { type: 'quote', text: { zh: '好的 AI 工作流，不是把思考交出去，而是让思考获得更好的回声。', en: '' } },
        { type: 'heading', text: { zh: '把重复的上下文保存下来', en: 'Save the context you use repeatedly' } },
        { type: 'paragraph', text: { zh: '当一类任务重复出现时，值得把稳定的背景信息、判断标准和输出模板保存成小模块。下一次开始时，不必从空白页面重新解释。', en: '' } },
        { type: 'code', language: 'text', code: 'context\n├── background.md\n├── constraints.md\n└── output-template.md' },
        { type: 'paragraph', text: { zh: '节奏慢一点，反而更容易在长期工作中获得确定感。', en: '' } },
      ],
      en: [
        { type: 'paragraph', text: { zh: '', en: 'AI tools are getting better at producing answers, but a good workflow should not only optimize for speed. What matters is whether we still leave room to understand the problem, make trade-offs, and reorganize the result.' } },
        { type: 'heading', text: { zh: '', en: 'Organize the input before starting the conversation' } },
        { type: 'paragraph', text: { zh: '', en: 'I break a task into four parts: background, goal, constraints, and delivery format. This is not about writing a perfect prompt; it is about understanding the problem before solving it.' } },
        { type: 'quote', text: { zh: '', en: 'A good AI workflow does not outsource thinking. It gives thinking a better echo.' } },
        { type: 'heading', text: { zh: '', en: 'Save the context you use repeatedly' } },
        { type: 'paragraph', text: { zh: '', en: 'When a type of task comes back often, save the stable background, decision criteria, and output template as small modules. The next session does not have to start from a blank page.' } },
        { type: 'code', language: 'text', code: 'context\n├── background.md\n├── constraints.md\n└── output-template.md' },
        { type: 'paragraph', text: { zh: '', en: 'A slightly slower rhythm can make long-term work feel much more grounded.' } },
      ],
    },
  },
  {
    slug: 'notes-on-digital-garden', date: '2026-08-28', readingTime: 4,
    category: { zh: '写作与知识管理', en: 'Writing & Knowledge' }, tags: { zh: ['写作', '知识管理'], en: ['Writing', 'Knowledge'] },
    title: { zh: '数字花园不只是一个网站', en: 'A digital garden is more than a website' },
    excerpt: { zh: '它更像一套让想法持续生长的工作方式：允许草稿存在，也允许观点不断修正。', en: 'It is a way of letting ideas grow: drafts are welcome, and opinions are allowed to change over time.' },
    content: {
      zh: [
        { type: 'paragraph', text: { zh: '博客通常被想象成一排按照时间排列的文章，但我更喜欢把它看作一座可以反复走访的花园。这里的内容不一定完整，却可以彼此连接。', en: '' } },
        { type: 'heading', text: { zh: '允许文章停留在半成品状态', en: 'Let posts remain unfinished for a while' } },
        { type: 'paragraph', text: { zh: '半成品并不意味着低质量，它只是说明一个想法仍在生长。公开记录这个过程，也能让未来的自己看到观点是怎样发生变化的。', en: '' } },
        { type: 'quote', text: { zh: '发布不是终点，而是给一个想法安排一次新的相遇。', en: '' } },
        { type: 'paragraph', text: { zh: '所以我不再把每一篇文章都当成最终答案。更重要的是留下线索，让下一次阅读可以从这里继续。', en: '' } },
      ],
      en: [
        { type: 'paragraph', text: { zh: '', en: 'A blog is often imagined as a timeline of finished essays. I prefer to think of it as a garden that can be revisited, where ideas do not need to be complete to be connected.' } },
        { type: 'heading', text: { zh: '', en: 'Let posts remain unfinished for a while' } },
        { type: 'paragraph', text: { zh: '', en: 'Unfinished does not mean low quality. It means an idea is still growing. Sharing the process lets our future selves see how a point of view changed.' } },
        { type: 'quote', text: { zh: '', en: 'Publishing is not an ending. It gives an idea a new chance to meet someone.' } },
        { type: 'paragraph', text: { zh: '', en: 'I no longer treat every post as a final answer. Leaving a useful trail is often enough for the next reading to continue from here.' } },
      ],
    },
  },
  {
    slug: 'building-a-small-vue-theme', date: '2026-08-25', readingTime: 6,
    category: { zh: '前端开发', en: 'Frontend Development' }, tags: { zh: ['Vue', 'Astro'], en: ['Vue', 'Astro'] },
    title: { zh: '用 Vue 和 Astro 搭建一个小而快的主题', en: 'Building a small and fast theme with Vue and Astro' },
    excerpt: { zh: '把静态内容交给 Astro，把必要的交互交给 Vue，保持页面简单，也保持开发体验愉快。', en: 'Let Astro handle static content and Vue handle the interactions that matter. Keep the page simple and the development experience pleasant.' },
    content: {
      zh: [
        { type: 'paragraph', text: { zh: '一个博客主题不需要把所有事情都交给客户端 JavaScript。文章、导航和 SEO 信息都可以在构建时生成，只有真正需要状态的部分才进行 hydration。', en: '' } },
        { type: 'heading', text: { zh: '让边界保持清楚', en: 'Keep the boundary clear' } },
        { type: 'paragraph', text: { zh: '页面布局负责组合内容，Vue 组件负责菜单和语言切换，数据文件负责描述文章。每一层都只处理自己最擅长的事情。', en: '' } },
        { type: 'code', language: 'ts', code: "const interactiveParts = [\n  'language-switcher',\n  'mobile-navigation',\n]" },
        { type: 'paragraph', text: { zh: '当组件边界清楚后，主题会更容易扩展到搜索、暗色模式和文章目录。', en: '' } },
      ],
      en: [
        { type: 'paragraph', text: { zh: '', en: 'A blog theme does not need to hand everything to client-side JavaScript. Posts, navigation, and SEO metadata can be generated at build time; only stateful pieces need hydration.' } },
        { type: 'heading', text: { zh: '', en: 'Keep the boundary clear' } },
        { type: 'paragraph', text: { zh: '', en: 'The page layout composes content, Vue components handle the menu and language switcher, and the data file describes posts. Each layer focuses on what it does best.' } },
        { type: 'code', language: 'ts', code: "const interactiveParts = [\n  'language-switcher',\n  'mobile-navigation',\n]" },
        { type: 'paragraph', text: { zh: '', en: 'Clear boundaries make it easier to add search, dark mode, and a table of contents later.' } },
      ],
    },
  },
  {
    slug: 'small-tools-big-leverage', date: '2026-08-20', readingTime: 3,
    category: { zh: '效率工具', en: 'Productivity' }, tags: { zh: ['工具', '阅读'], en: ['Tools', 'Reading'] },
    title: { zh: '小工具带来的长期杠杆', en: 'The long-term leverage of small tools' },
    excerpt: { zh: '工具的价值不只在于节省几分钟，更在于让正确的行为变得容易重复。', en: 'A tool is not only valuable because it saves a few minutes. It makes the right behavior easier to repeat.' },
    content: {
      zh: [
        { type: 'paragraph', text: { zh: '我喜欢那些完成一件小事，却能在未来不断减少摩擦的工具。它们可能不起眼，却会慢慢改变工作的默认路径。', en: '' } },
        { type: 'heading', text: { zh: '先解决摩擦，再追求功能', en: 'Remove friction before adding features' } },
        { type: 'paragraph', text: { zh: '当一个流程需要额外的意志力才能完成时，通常说明它还可以被重新设计。少一个步骤，可能比增加十个功能更有价值。', en: '' } },
        { type: 'quote', text: { zh: '最好的自动化，是让好习惯不再需要被提醒。', en: '' } },
      ],
      en: [
        { type: 'paragraph', text: { zh: '', en: 'I like tools that solve one small problem but keep reducing friction in the future. They may look modest, yet slowly change the default path of work.' } },
        { type: 'heading', text: { zh: '', en: 'Remove friction before adding features' } },
        { type: 'paragraph', text: { zh: '', en: 'When a process needs extra willpower to happen, it probably needs a redesign. Removing one step can be more valuable than adding ten features.' } },
        { type: 'quote', text: { zh: '', en: 'The best automation makes a good habit stop asking for reminders.' } },
      ],
    },
  },
]
