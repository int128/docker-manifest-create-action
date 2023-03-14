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

  await exec.exec('docker', ['version'])

  const nonLatestTags = inputs.tags.filter((tag) => !tag.endsWith(':latest'))
  const latestTag = inputs.tags.find((tag) => tag.endsWith(':latest'))

  for (const tag of nonLatestTags) {
    const sourceManifests = getSourceManifests(tag, inputs.suffixes)
    await dockerManifestCreatePush(tag, sourceManifests)
    core.info(`Pushed a manifest ${tag}`)
  }

  if (latestTag) {
    if (nonLatestTags.length === 0) {
      throw new Error(`when latest tag is given, also non-latest tag must be given`)
    }
    const nonLatestTag = nonLatestTags[0]
    const sourceManifests = getSourceManifests(nonLatestTag, inputs.suffixes)
    await dockerManifestCreatePush(latestTag, sourceManifests)
    core.info(`Pushed a manifest ${latestTag}`)
  }
}

export const getSourceManifests = (tag: string, suffixes: string[]) => suffixes.map((suffix) => `${tag}${suffix}`)

const dockerManifestCreatePush = async (destination: string, source: string[]) => {
  await exec.exec('docker', ['manifest', 'create', destination, ...source])
  await exec.exec('docker', ['manifest', 'push', destination])
  await exec.exec('docker', ['manifest', 'inspect', destination])
}
