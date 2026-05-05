import * as core from '@actions/core'
import { run } from './run.js'

const main = async (): Promise<void> => {
  function splitStringOnWhitespace(input: string) {
    return input.split(/\s+/).filter(x => x !== '')
  }
  const outputs = await run({
    push: core.getBooleanInput('push', { required: true }),
    indexAnnotations: splitStringOnWhitespace(core.getInput('index-annotations')),
    tags: splitStringOnWhitespace(core.getInput('tags')),
    sources: splitStringOnWhitespace(core.getInput('sources', { required: true })),
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
