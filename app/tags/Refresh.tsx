'use client'

import { revalidatePath } from 'next/cache'
import { addTag } from './tag'

export default function Rerefsh() {
  return (
    <button
      className="inline-block rounded border border-indigo-600 bg-indigo-600 px-12 py-3 text-sm font-medium text-white hover:bg-transparent hover:text-indigo-600 focus:outline-none focus:ring active:text-indigo-500"
      onClick={async () => {
        const savedTags = await addTag(Math.random() > 0.5 ? 'Next.js' : 'Remix')
        console.log('tags updated', savedTags)
      }}
    >
      refresh
    </button>
  )
}
