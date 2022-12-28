import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  await run({
    tags: core.getMultilineInput('tags', { required: true }),
    digests: core.getInput('digests').split(/\s*,\s*/),
    suffixes: core.getMultilineInput('suffixes'),
  })
}

main().catch((e) => core.setFailed(e instanceof Error ? e : String(e)))
