'use server'

import { revalidatePath } from 'next/cache'

const tags = ['Node.js', 'Css', 'React']

export async function getTags() {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return tags
}

export async function addTag(tag: string) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  tags.push(tag)
  revalidatePath('/tags', 'page')
  return tags
}
