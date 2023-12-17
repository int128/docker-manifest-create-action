import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  const outputs = await run({
    tags: core.getMultilineInput('tags', { required: true }),
    sources: core.getMultilineInput('sources', { required: true }),
  })
  core.info(`Setting outputs: ${JSON.stringify(outputs, undefined, 2)}`)
  core.setOutput('digest', outputs.digest)
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
