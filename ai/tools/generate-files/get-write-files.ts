import type { DataPart } from '../../messages/data-parts'
import type { File } from './get-contents'
import type { UIMessageStreamWriter, UIMessage } from 'ai'
import { getRichError } from '../get-rich-error'

interface Params {
  sandboxId: string
  toolCallId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  writeFile: (args: { sandboxId: string; path: string; content: string }) => Promise<void>
}

export function getWriteFiles({ sandboxId, toolCallId, writer, writeFile }: Params) {
  return async function writeFiles(params: {
    written: string[]
    files: File[]
    paths: string[]
  }) {
    const paths = params.written.concat(params.files.map((file) => file.path))
    writer.write({
      id: toolCallId,
      type: 'data-generating-files',
      data: { paths, status: 'uploading' },
    })

    try {
      for (const file of params.files) {
        await writeFile({
          sandboxId,
          path: file.path,
          content: file.content,
        })
      }
    } catch (error) {
      const richError = getRichError({
        action: 'write files to sandbox',
        args: params,
        error,
      })

      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: {
          error: richError.error,
          status: 'error',
          paths: params.paths,
        },
      })

      return richError.message
    }

    writer.write({
      id: toolCallId,
      type: 'data-generating-files',
      data: { paths, status: 'uploaded' },
    })
  }
}
