#!/usr/bin/env zx

import { $, chalk, glob } from 'zx'
import fs from 'fs'
import { resolve } from 'path'

const inRoot = (path) => resolve(__dirname, '../../', path)
const store = inRoot('data')
const fontPath = inRoot('./scripts/fontsubset/LXGWWenKaiScreen.ttf')
const subsetFontName = 'xai-wu-wen-kai-screen-subset.woff2'
const output = inRoot(`./app/${subsetFontName}`)

async function subsetFont() {
  console.log(chalk.blue('Font subset started...'))
  const charSet = new Set()
  // Read all files in the store
  const files = await glob([store + '/**/*'])

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8')
    // Add each character to the set
    for (const char of content) {
      charSet.add(char)
    }
  })

  charSet.delete('\n')
  charSet.delete('\r')
  charSet.delete(' ')
  // Generate string of unique characters
  const uniqueChars = Array.from(charSet).join('')

  // Log the unique characters to file
  fs.writeFileSync(inRoot('./scripts/fontsubset/unique-chars.txt'), uniqueChars)

  console.log(chalk.blue('Unique characters written to file! ', chalk.green(charSet.size)))

  // Subset the font
  await $`pyftsubset ${inRoot(fontPath)} --output-file=${inRoot(output)} --text=${uniqueChars}`

  console.log(chalk.blue('Font subset complete!'))
}

async function commit() {
  const statusText = await $`git status --porcelain`

  const raw = statusText.text()
  const changedFiles = statusText
    .text()
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => line.trim().split(' ')[1])

  if (changedFiles.some((file) => file.includes(subsetFontName))) {
    // 清空 git staged 区
    await $`git reset -q HEAD`
    await $`git add ${inRoot(output)}`
    await $`git commit -m "chore: update font subset"`
  }
}

await subsetFont()
await commit()
