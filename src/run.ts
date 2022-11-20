import * as core from '@actions/core'
import * as exec from '@actions/exec'

type Inputs = {
  tags: string[]
  suffixes: string[]
}

export const run = async (inputs: Inputs): Promise<void> => {
  if (inputs.suffixes.length < 1) {
    throw new Error(`one or more suffixes must be set`)
  }
  for (const tag of inputs.tags) {
    const sourceManifests = getSourceManifests(tag, inputs.suffixes)
    await exec.exec('docker', ['manifest', 'create', tag, ...sourceManifests])
    await exec.exec('docker', ['manifest', 'push', tag])
    await exec.exec('docker', ['manifest', 'inspect', tag])
    core.info(`Pushed a manifest ${tag}`)
  }
}

export const getSourceManifests = (tag: string, suffixes: string[]) => suffixes.map((suffix) => `${tag}${suffix}`)
