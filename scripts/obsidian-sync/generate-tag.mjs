import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { readFileSync } from 'fs'
import { basename, extname, resolve } from 'path'

const template = `You are a blog tag generator. 
Based on the following blog content and the specified tag list, generate 1-3 most relevant tags.
The tags should be separated by commas.
Only output the tags, nothing else.

Specified tag list:
- JavaScript
- TypeScript
- CSS
- HTML5
- Webpack
- Node.js
- 前端性能优化
- 响应式设计
- 前端安全
- PWA
- 前端测试
- 工程化
- 架构
- 调试技巧
- 动画
- 数据可视化
- SEO
- 设计模式
- 新技术趋势
- 开发环境
- 跨平台开发
- 用户体验优化
- GraphQL
- 微前端
- 小程序
- WebAssembly
- Flutter
- Dart
- Electron
- React Native
- 混合开发
- 前端框架
- 数据库
- AI 应用
- 区块链

Content:
{content}

Tags:`

async function generateTags(content) {
  const prompt = new PromptTemplate({
    template,
    inputVariables: ['content'],
  })
  const model = new ChatOpenAI({
    temperature: 0,
    model: process.env.OPENAI_MODEL,
  })
  const chain = prompt.pipe(model)
  const response = await chain.invoke({ content })

  return response.content.split(',').map((tag) => tag.trim())
}

// Example usage:
// const blog = resolve(
//   import.meta.dirname,
//   '../../data/blog/tech/VSCode + Ubuntu Remote development.mdx'
// )
// const tags = await generateTags(blog)
// console.log(tags)

export { generateTags }
