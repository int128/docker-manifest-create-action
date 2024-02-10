import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  const outputs = await run({
    push: core.getBooleanInput('push', { required: true }),
    annotations: core.getMultilineInput('annotations'),
    tags: core.getMultilineInput('tags'),
    sources: core.getMultilineInput('sources', { required: true }),
  })
  if (outputs.digest) {
    core.info(`Setting outputs.digest=${outputs.digest}`)
    core.setOutput('digest', outputs.digest)
  }
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
