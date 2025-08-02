import { glob, argv } from 'zx'
import { generateTags } from './generate-tag.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { generateSummary } from './generate-summary.mjs'
import { config } from 'dotenv'
import path from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

config({ path: path.resolve(import.meta.dirname, '../../.env.local') })

async function generate(dir) {
  const files = await glob(`${dir}/**/*.{md,mdx}`)
  let index = 1
  for (const file of files) {
    console.log('')
    console.log(`Processing file: ${file}, ${index++}/${files.length}`)
    let retries = 3
    while (retries > 0) {
      try {
        await generateFile(file)
        break
      } catch (error) {
        console.error(`Error processing file: ${file}, retries left: ${retries - 1}`, error)
        retries--
        if (retries === 0) {
          console.error(`Failed to process file after multiple attempts: ${file}`)
        }
      }
    }
  }
}

async function generateFile(file) {
  const content = await readFile(file, { encoding: 'utf8' })
  const tags = await generateTags(content)
  const summary = await generateSummary(content)
  let newContent = content

  if (content.startsWith('---')) {
    const yamlEnd = content.indexOf('---', 4)
    try {
      const meta = parseYaml(content.substring(4, yamlEnd))
      meta.tags = tags
      meta.summary = summary
      newContent = `---\n${stringifyYaml(meta)}---\n${content.substring(yamlEnd + 3)}`
    } catch (error) {
      console.error(`Error parsing YAML frontmatter in file: ${file}`, error)
    }
  } else {
    console.log('No frontmatter detected, skipping tag replacement. file: ', file)
  }

  await writeFile(file, newContent, 'utf-8')
}

generate(argv._)
