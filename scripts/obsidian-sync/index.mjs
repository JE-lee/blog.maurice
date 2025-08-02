#!/usr/bin/env zx
import { fs, path, glob } from 'zx'
import sizeOf from 'image-size'
import { generateTags } from './generate-tag.mjs'
import { generateSummary } from './generate-summary.mjs'
import { configDotenv } from 'dotenv'
import yaml from 'yaml'
import prettier from 'prettier'
import prettierConfig from '../../prettier.config.js'

configDotenv({ path: path.resolve(import.meta.dirname, '../../.env.local') })

const OBSIDIAN_VAULT = '/home/who/Workspace/obsidian-myvault'
const OBSIDIAN_BLOG_DIR = path.resolve(OBSIDIAN_VAULT, 'blog')
const BLOG_DIR = path.resolve(import.meta.dirname, '../../data/blog')
const IMG_DIR = path.resolve(import.meta.dirname, '../../public/static/images/blog') // 所有图片都放在这里

const obsidianBlogs = await glob('**/*.md', { cwd: OBSIDIAN_BLOG_DIR, absolute: true })
for (const blog of obsidianBlogs) {
  const { frontmatter } = extractFrontmatter(await fs.readFile(blog, 'utf8'))
  // skip draft blog
  if (frontmatter?.draft) {
    continue
  }
  await copyBlog(blog)
}

async function copyBlog(blog) {
  let raw = await fs.readFile(blog, 'utf8')
  raw = await maybeAddFrontmatter(raw, blog)
  raw = await convertObsidianImages(raw)
  raw = await convertExternalImages(raw)

  const dest = getBlogDest(blog)
  await fs.ensureDir(path.dirname(dest))
  raw = await prettier.format(raw, { ...prettierConfig, parser: 'mdx' })
  await fs.writeFile(dest, raw, { encoding: 'utf8' })
}

function getBlogDest(blog) {
  let relativeObsidianPath = path.relative(OBSIDIAN_BLOG_DIR, blog)
  // change the extension to .mdx
  relativeObsidianPath = path.join(
    path.dirname(relativeObsidianPath),
    path.basename(relativeObsidianPath, path.extname(relativeObsidianPath)) + '.mdx'
  )
  return path.resolve(BLOG_DIR, relativeObsidianPath)
}

async function convertObsidianImages(raw) {
  const reg = /!\[\[(.*)\]\]/g
  let obsidianImage
  while ((obsidianImage = reg.exec(raw))) {
    const img = path.resolve(OBSIDIAN_VAULT, 'attachements', obsidianImage[1])
    const blogImgPath = copyImage(img)
    raw = removeRaw(raw, obsidianImage.index, obsidianImage[0].length)
    let blogImgUri = path.relative(path.resolve(import.meta.dirname, '../../public'), blogImgPath)
    blogImgUri = path.join('/', blogImgUri)
    // 考虑 windows 和 linux 的兼容性
    blogImgUri = path.posix.normalize(blogImgUri.replace(/\\/g, '/'))
    const nextImage = generateNextImage(blogImgUri)
    raw = insertToRaw(raw, nextImage, obsidianImage.index)
  }

  return raw
}

async function convertExternalImages(raw) {
  const reg = /!\[.*\]\((.*)\)/g
  let externalImage
  while ((externalImage = reg.exec(raw)) !== null) {
    const url = externalImage[1]
    raw = removeRaw(raw, externalImage.index, externalImage[0].length)
    raw = insertToRaw(raw, generateNextImage(url), externalImage.index)
  }
  return raw
}

function copyImage(img) {
  const imgPath = path.resolve(OBSIDIAN_VAULT, img)
  const imgName = path.basename(img)
  const dest = path.resolve(IMG_DIR, imgName)
  fs.ensureDirSync(IMG_DIR)
  fs.copyFileSync(imgPath, dest)
  return dest
}

function removeRaw(raw, index, length) {
  return raw.slice(0, index) + raw.slice(index + length)
}

function insertToRaw(raw, insertion, index) {
  return raw.slice(0, index) + insertion + raw.slice(index)
}

function generateNextImage(uri) {
  const fullname = uri.split('?')[0].split('/').pop()
  const basename = fullname.split('.').slice(0, -1).join('.')
  const nextImage = `
<div className="flex justify-center">
  <Image
    alt="${basename}"
    src="${uri}"
    width={0}
    height={0}
    sizes="100vw"
    className="my-0 w-auto h-auto max-h-[400px] max-w-full"
    style={{ objectFit: "contain" }}
  />
</div>
`
  return '\n' + nextImage + '\n'
}

function getImageSize(image) {
  return new Promise((resolve, reject) => {
    sizeOf(image, (err, size) => {
      if (err) {
        reject(err)
      } else {
        resolve(size)
      }
    })
  })
}

async function maybeAddFrontmatter(raw, blogPath) {
  const { content: withoutFrontMatter, frontmatter: frontmatterFromRaw } = extractFrontmatter(raw)
  raw = withoutFrontMatter

  const destFile = getBlogDest(blogPath)
  const fsStat = await fs.stat(blogPath)
  const lastmod = fsStat.mtime.toISOString()

  if (await fs.exists(destFile)) {
    const { frontmatter: destFileFrontMatter } = extractFrontmatter(
      await fs.readFile(destFile, 'utf8')
    )

    // no change
    if (destFileFrontMatter.lastmod && new Date(destFileFrontMatter.lastmod) >= fsStat.mtime) {
      return (
        `---
${yaml.stringify(destFileFrontMatter)}
---
` + raw
      )
    }
  }
  const tags = await generateTags(raw)
  const summary = await generateSummary(raw)
  const frontmatter = {
    title: path.basename(blogPath, path.extname(blogPath)),
    date: frontmatterFromRaw?.date || fsStat.birthtime.toISOString().split('T')[0],
    lastmod: lastmod,
    tags: tags,
    summary: summary,
    draft: false,
    images: [],
  }
  raw =
    `---
${yaml.stringify(frontmatter)}
---
` + raw

  return raw
}

function extractFrontmatter(raw) {
  const frontmatterContent = raw.match(/^---\n([\s\S]*?)\n---/)?.[1]
  if (!frontmatterContent) {
    return { frontmatter: null, content: raw }
  }
  const frontmatter = yaml.parse(frontmatterContent)
  return {
    frontmatter,
    content: raw.substring(frontmatterContent.length + 8),
  }
}
