import { generateArticleDocument } from './generate-article.mjs'

const story = {
  hnId: 49500001,
  hnUrl: 'https://news.ycombinator.com/item?id=49500001',
  originalUrl: 'https://example.com/ai-workflow',
  title: 'A practical guide to reliable AI workflows',
  author: 'demo-author',
  score: 186,
  commentCount: 42,
  publishedAt: '2026-08-31T12:00:00.000Z',
}

const draft = {
  slug: 'reliable-ai-workflows',
  title: { zh: '构建可靠 AI 工作流的实用方法', en: 'Practical ways to build reliable AI workflows' },
  excerpt: { zh: '从输入整理、事实边界和人工复核三个方面，理解如何让 AI 工作流更可靠。', en: 'How organized inputs, factual boundaries, and human review make AI workflows more reliable.' },
  category: { zh: '人工智能', en: 'Artificial Intelligence' },
  tags: { zh: ['AI', '工作流', '可靠性'], en: ['AI', 'Workflow', 'Reliability'] },
  content: {
    zh: [
      { type: 'heading', text: { zh: '为什么可靠性比速度更重要', en: 'Why reliability matters more than speed' } },
      { type: 'paragraph', text: { zh: '在真实的 AI 应用中，可靠性往往比响应速度更影响用户的长期信任。一个能够稳定给出可核查结果的系统，即使响应稍慢一些，也更容易被引入生产环境。团队在评估模型时，除了关注基准测试的分数，还应该观察它的失败模式是否可预测、错误的输出是否容易被发现和纠正。毕竟线上环境无法容忍随机出现的幻觉内容。', en: 'In real-world AI applications, reliability usually matters more than raw speed when it comes to earning long-term user trust. A system that consistently produces verifiable results is easier to promote into production, even if it responds a little more slowly. When teams evaluate models, they should look beyond benchmark scores and study whether failures are predictable and whether bad outputs can be detected and corrected quickly, because live environments cannot tolerate randomly appearing hallucinations.' } },
      { type: 'heading', text: { zh: '先整理输入和约束', en: 'Organize inputs and constraints first' } },
      { type: 'paragraph', text: { zh: '整理输入是提升可靠性的第一步。上下文越清晰，模型自由发挥的空间就越小。把信息来源、任务目标和限制条件显式地写进提示词，可以显著降低模型编造内容的概率。对于时效性较强的任务，还应注明数据的截止时间，避免模型用旧知识回答新问题。同时，把长文档裁剪成与任务相关的片段，也能减少无关信息对结果的干扰。', en: 'Organizing inputs is the first step toward reliability. The clearer the context, the less room a model has to improvise. Writing the sources, objectives, and constraints explicitly into the prompt significantly reduces the probability of fabricated content. For time-sensitive tasks, the data cutoff should be stated so the model does not answer new questions with stale knowledge. Trimming long documents down to the fragments that actually matter for the task also helps, because irrelevant context can quietly distort the result.' } },
      { type: 'paragraph', text: { zh: '划定事实边界是第二步。模型不应当被要求给出它自己无法核实的判断，例如尚未发生的市场走势，或者尚未公布的统计数字。当原始资料不可用时，更稳妥的做法是降低结论的强度，把不确定性明确告诉读者，而不是硬给出一套看似完整的答案。这种克制虽然会让内容显得保守，却能守住事实的底线。', en: 'Drawing factual boundaries is the second step. A model should never be asked to make claims it cannot verify, such as market movements that have not happened yet or statistics that have not been published. When the original material is unavailable, the safer approach is to weaken the strength of conclusions and tell readers exactly where the uncertainty lies, rather than presenting a confident but unreliable answer. That restraint can make content feel conservative, yet it protects the factual floor that serious publications depend on.' } },
      { type: 'paragraph', text: { zh: '引入人工复核是第三步。自动化流程可以覆盖大部分日常产出，但关键结论仍然应该由人来审阅。复核者需要检查引用是否真实存在、推理链条是否成立、表达方式是否符合语境。把复核过程中发现的问题记录下来，还能反过来改进提示词的设计和流程的编排，形成持续优化的闭环。', en: 'Adding human review is the third step. Automated pipelines can cover most routine output, but key conclusions should still be read by a person. Reviewers verify that citations actually exist, that the chain of reasoning holds together, and that the wording fits the intended audience. Recording the problems found during review feeds back into prompt design and pipeline structure, which turns every mistake into a concrete improvement for the next iteration of the system.' } },
      { type: 'paragraph', text: { zh: '监控与回滚机制同样重要。为生成结果建立评分规则和抽样检查机制，一旦质量指标出现异常，就能第一时间发现并定位。上线新模型时采用灰度发布策略，先在小范围流量中验证效果，再逐步扩大到全量，可以把潜在问题的影响控制在最小范围，避免一次糟糕的更新影响所有用户。', en: 'Monitoring and rollback mechanisms matter just as much. Establish scoring rules and sampling checks for generated results so that quality problems are noticed and located quickly. When shipping a new model, use a staged rollout: validate it on a small fraction of traffic first, then expand gradually to everyone. This keeps the blast radius of a bad update small and prevents one flawed release from affecting the entire user base at once.' } },
      { type: 'paragraph', text: { zh: '总而言之，可靠性是一项持续的系统工程，而不是一次性的配置任务。随着模型版本升级和数据分布变化，原本稳定的流程也可能悄悄退化。定期回顾失败案例、更新约束条件、调整验收标准，才能让系统在长期运行中保持可信。这些做法并不复杂，却往往决定了一个 AI 应用能否真正交付价值。', en: 'In short, reliability is continuous engineering rather than a one-time configuration task. As models are upgraded and data distributions shift, a process that used to be stable can quietly degrade over time. Reviewing failure cases regularly, refreshing constraints, and adjusting acceptance criteria are what keep a system trustworthy across long-running operations. None of these practices is complicated on its own, yet together they often decide whether an AI application can actually deliver lasting value to its readers.' } },
    ],
    en: [
      { type: 'heading', text: { zh: '为什么可靠性比速度更重要', en: 'Why reliability matters more than speed' } },
      { type: 'paragraph', text: { zh: '在真实的 AI 应用中，可靠性往往比响应速度更影响用户的长期信任。一个能够稳定给出可核查结果的系统，即使响应稍慢一些，也更容易被引入生产环境。团队在评估模型时，除了关注基准测试的分数，还应该观察它的失败模式是否可预测、错误的输出是否容易被发现和纠正。毕竟线上环境无法容忍随机出现的幻觉内容。', en: 'In real-world AI applications, reliability usually matters more than raw speed when it comes to earning long-term user trust. A system that consistently produces verifiable results is easier to promote into production, even if it responds a little more slowly. When teams evaluate models, they should look beyond benchmark scores and study whether failures are predictable and whether bad outputs can be detected and corrected quickly, because live environments cannot tolerate randomly appearing hallucinations.' } },
      { type: 'heading', text: { zh: '先整理输入和约束', en: 'Organize inputs and constraints first' } },
      { type: 'paragraph', text: { zh: '整理输入是提升可靠性的第一步。上下文越清晰，模型自由发挥的空间就越小。把信息来源、任务目标和限制条件显式地写进提示词，可以显著降低模型编造内容的概率。对于时效性较强的任务，还应注明数据的截止时间，避免模型用旧知识回答新问题。同时，把长文档裁剪成与任务相关的片段，也能减少无关信息对结果的干扰。', en: 'Organizing inputs is the first step toward reliability. The clearer the context, the less room a model has to improvise. Writing the sources, objectives, and constraints explicitly into the prompt significantly reduces the probability of fabricated content. For time-sensitive tasks, the data cutoff should be stated so the model does not answer new questions with stale knowledge. Trimming long documents down to the fragments that actually matter for the task also helps, because irrelevant context can quietly distort the result.' } },
      { type: 'paragraph', text: { zh: '划定事实边界是第二步。模型不应当被要求给出它自己无法核实的判断，例如尚未发生的市场走势，或者尚未公布的统计数字。当原始资料不可用时，更稳妥的做法是降低结论的强度，把不确定性明确告诉读者，而不是硬给出一套看似完整的答案。这种克制虽然会让内容显得保守，却能守住事实的底线。', en: 'Drawing factual boundaries is the second step. A model should never be asked to make claims it cannot verify, such as market movements that have not happened yet or statistics that have not been published. When the original material is unavailable, the safer approach is to weaken the strength of conclusions and tell readers exactly where the uncertainty lies, rather than presenting a confident but unreliable answer. That restraint can make content feel conservative, yet it protects the factual floor that serious publications depend on.' } },
      { type: 'paragraph', text: { zh: '引入人工复核是第三步。自动化流程可以覆盖大部分日常产出，但关键结论仍然应该由人来审阅。复核者需要检查引用是否真实存在、推理链条是否成立、表达方式是否符合语境。把复核过程中发现的问题记录下来，还能反过来改进提示词的设计和流程的编排，形成持续优化的闭环。', en: 'Adding human review is the third step. Automated pipelines can cover most routine output, but key conclusions should still be read by a person. Reviewers verify that citations actually exist, that the chain of reasoning holds together, and that the wording fits the intended audience. Recording the problems found during review feeds back into prompt design and pipeline structure, which turns every mistake into a concrete improvement for the next iteration of the system.' } },
      { type: 'paragraph', text: { zh: '监控与回滚机制同样重要。为生成结果建立评分规则和抽样检查机制，一旦质量指标出现异常，就能第一时间发现并定位。上线新模型时采用灰度发布策略，先在小范围流量中验证效果，再逐步扩大到全量，可以把潜在问题的影响控制在最小范围，避免一次糟糕的更新影响所有用户。', en: 'Monitoring and rollback mechanisms matter just as much. Establish scoring rules and sampling checks for generated results so that quality problems are noticed and located quickly. When shipping a new model, use a staged rollout: validate it on a small fraction of traffic first, then expand gradually to everyone. This keeps the blast radius of a bad update small and prevents one flawed release from affecting the entire user base at once.' } },
      { type: 'paragraph', text: { zh: '总而言之，可靠性是一项持续的系统工程，而不是一次性的配置任务。随着模型版本升级和数据分布变化，原本稳定的流程也可能悄悄退化。定期回顾失败案例、更新约束条件、调整验收标准，才能让系统在长期运行中保持可信。这些做法并不复杂，却往往决定了一个 AI 应用能否真正交付价值。', en: 'In short, reliability is continuous engineering rather than a one-time configuration task. As models are upgraded and data distributions shift, a process that used to be stable can quietly degrade over time. Reviewing failure cases regularly, refreshing constraints, and adjusting acceptance criteria are what keep a system trustworthy across long-running operations. None of these practices is complicated on its own, yet together they often decide whether an AI application can actually deliver lasting value to its readers.' } },
    ],
  },
}

const config = {
  endpoint: 'https://gateway.example.com/v1/chat/completions',
  apiKey: 'dry-run-key',
  model: 'dry-run-model',
  temperature: 0.4,
  maxTokens: 5000,
  requestTimeoutMs: 5000,
  requestRetries: 0,
}

const jsonResponse = (payload) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => payload,
})

const fetchImpl = async (url, options) => {
  if (url !== config.endpoint) throw new Error('Unexpected dry-run URL: ' + url)
  const request = JSON.parse(options.body)
  if (request.model !== config.model || !request.response_format) throw new Error('Dry-run request body is invalid')
  return jsonResponse({ choices: [{ message: { content: JSON.stringify(draft) } }] })
}

const sourceFetchImpl = async () => ({
  ok: true,
  status: 200,
  headers: { get: () => 'text/html; charset=utf-8' },
  text: async () => '<html><head><style>hidden</style></head><body><h1>Source</h1><p>Reliable AI needs explicit constraints.</p><script>alert(1)</script></body></html>',
})

const document = await generateArticleDocument(story, {
  config,
  fetchImpl,
  sourceFetchImpl,
  now: new Date('2026-09-01T00:00:00.000Z'),
  sourceOptions: { retries: 0 },
  aiOptions: { retryDelayMs: 0 },
})

console.log(JSON.stringify(document, null, 2))
