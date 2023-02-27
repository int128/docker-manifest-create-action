import * as core from '@actions/core'
import * as exec from '@actions/exec'

type Inputs = {
  tags: string[]
  digests: string[]
  suffixes: string[]
}

export const run = async (inputs: Inputs): Promise<void> => {
  for (const tag of inputs.tags) {
    const sourceManifests = getSourceManifests(tag, inputs)
    await exec.exec('docker', ['manifest', 'create', tag, ...sourceManifests])
    await exec.exec('docker', ['manifest', 'push', tag])
    await exec.exec('docker', ['manifest', 'inspect', tag])
    core.info(`Pushed a manifest ${tag}`)
  }
}

export const getSourceManifests = (tag: string, inputs: Pick<Inputs, 'digests' | 'suffixes'>) => {
  if (inputs.digests.length > 0) {
    const repository = tag.replace(/:.+?$/, '')
    return inputs.digests.map((digest) => `${repository}@${digest}`)
  }
  if (inputs.suffixes.length > 0) {
    return inputs.suffixes.map((suffix) => `${tag}${suffix}`)
  }
  throw new Error(`either digests or suffixes must be set`)
}
