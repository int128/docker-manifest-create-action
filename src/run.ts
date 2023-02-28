import * as core from '@actions/core'
import * as exec from '@actions/exec'

type Inputs = {
  tags: string[]
  digests: string[]
  suffixes: string[]
}

export const run = async (inputs: Inputs): Promise<void> => {
  if (inputs.suffixes.length < 1 && inputs.digests.length < 1) {
    throw new Error(`one or more suffixes/digests must be set`)
  }

  const nonLatestTags = inputs.tags.filter((tag) => !tag.endsWith(':latest'))
  const latestTag = inputs.tags.find((tag) => tag.endsWith(':latest'))

  for (const tag of nonLatestTags) {
    const sourceManifests = getSourceManifests(tag, inputs)
    await dockerManifestCreatePush(tag, sourceManifests)
    core.info(`Pushed a manifest ${tag}`)
  }

  if (latestTag) {
    if (nonLatestTags.length === 0) {
      throw new Error(`when latest tag is given, also non-latest tag must be given`)
    }
    const nonLatestTag = nonLatestTags[0]
    const sourceManifests = getSourceManifests(nonLatestTag, inputs)
    await dockerManifestCreatePush(latestTag, sourceManifests)
    core.info(`Pushed a manifest ${latestTag}`)
  }
}

export const getSourceManifests = (tag: string, inputs: Pick<Inputs, 'digests' | 'suffixes'>) => {
  if (inputs.digests.length > 0) {
    const repository = tag.replace(/:.+?$/, '')
    return inputs.digests.map((suffix) => `${repository}@${suffix}`)
  }
  if (inputs.suffixes.length > 0) {
    return inputs.suffixes.map((suffix) => `${tag}${suffix}`)
  }
  throw new Error(`either digests or suffixes must be set`)
}

const dockerManifestCreatePush = async (destination: string, source: string[]) => {
  await exec.exec('docker', ['manifest', 'create', destination, ...source])
  await exec.exec('docker', ['manifest', 'push', destination])
  await exec.exec('docker', ['manifest', 'inspect', destination])
}
