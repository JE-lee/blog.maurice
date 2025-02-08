import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import * as path from 'node:path'
import { readFileSync } from 'node:fs'

const template = `You are a blog summary generator.
Based on the following blog content, generate a concise summary in Chinese that captures the main points.
Keep the summary between 100-150 characters.
Only output the summary, nothing else.

Content:
{content}

Summary:`

async function generateSummary(content) {
  const prompt = new PromptTemplate({
    template,
    inputVariables: ['content'],
  })
  const model = new ChatOpenAI({
    temperature: 0.3,
    model: 'moonshot-v1-auto',
  })
  const chain = prompt.pipe(model)
  const response = await chain.invoke({ content })

  return response.content.trim()
}

export { generateSummary }

// Example usage:
// const blogPath = path.resolve(
//   import.meta.dirname,
//   '../../data/blog/tech/front-end/esm-in-nodejs.mdx'
// )
// const blogContent = readFileSync(blogPath, 'utf-8')
// const summary = await generateSummary(blogContent)

// console.log(`Summary length: ${summary.length}`)
// console.log(summary)
