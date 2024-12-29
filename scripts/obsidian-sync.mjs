#!/usr/bin/env zx
import { fs, path, glob } from 'zx'
import sizeOf from 'image-size'

const OBSIDIAN_VAULT = '/Users/wuliheng/Documents/obsidian'
const OBSIDIAN_BLOG_DIR = path.resolve(OBSIDIAN_VAULT, 'blog')
const BLOG_DIR = path.resolve(import.meta.dirname, '../data/blog')
const IMG_DIR = path.resolve(import.meta.dirname, '../public/static/images/blog') // 所有图片都放在这里

const obsidianBlogs = await glob('**/*.md', { cwd: OBSIDIAN_BLOG_DIR, absolute: true })
for (const blog of obsidianBlogs) {
  await copyBlog(blog)
}

async function copyBlog(blog) {
  let raw = await fs.readFile(blog, 'utf8')
  raw = await transformImages(raw)
  let relativeObsidianPath = path.relative(OBSIDIAN_BLOG_DIR, blog)
  // change the extension to .mdx
  relativeObsidianPath = path.join(
    path.dirname(relativeObsidianPath),
    path.basename(relativeObsidianPath, path.extname(relativeObsidianPath)) + '.mdx'
  )

  const dest = path.resolve(BLOG_DIR, relativeObsidianPath)
  await fs.ensureDir(path.dirname(dest))
  await fs.writeFile(dest, raw, { encoding: 'utf8' })
}

async function transformImages(raw) {
  const reg = /!\[\[(.*)\]\]/g
  let obsidianImage
  while ((obsidianImage = reg.exec(raw))) {
    const img = path.resolve(OBSIDIAN_VAULT, 'attachements', obsidianImage[1])
    const blogImg = copyImage(img)
    raw = removeRaw(raw, obsidianImage.index, obsidianImage[0].length)
    const nextImage = await generateNextImage(blogImg)
    raw = insertToRaw(raw, nextImage, obsidianImage.index)
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

async function generateNextImage(image) {
  let src = path.relative(path.resolve(import.meta.dirname, '../public'), image)
  src = path.join('/', src)

  const { width, height } = await getImageSize(image)

  const nextImage = `
<div className="flex justify-center">
  <Image
    alt="courier-new-fallback-font"
    src="${src}"
    width={${width}}
    height={${height}}
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
