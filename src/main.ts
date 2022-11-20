import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  await run({
    tags: core.getMultilineInput('tags', { required: true }),
    suffixes: core.getMultilineInput('suffixes', { required: true }),
  })
}

main().catch((e) => core.setFailed(e instanceof Error ? e : String(e)))
