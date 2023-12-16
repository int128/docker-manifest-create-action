import * as core from '@actions/core'
import * as exec from '@actions/exec'

type Inputs = {
  tags: string[]
  suffixes: string[]
  builder: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  if (inputs.suffixes.length < 1) {
    throw new Error(`one or more suffixes must be set`)
  }

  const builder = await determineBuilder(inputs.builder)
  core.info(`Using builder: ${builder}`)

  const nonLatestTags = inputs.tags.filter((tag) => !tag.endsWith(':latest'))
  const latestTags = inputs.tags.filter((tag) => tag.endsWith(':latest'))
  for (const tag of nonLatestTags) {
    const sourceManifests = getSourceManifests(tag, inputs.suffixes)
    await pushManifest(tag, sourceManifests, builder)
    core.info(`Pushed a manifest ${tag}`)
  }

  if (latestTags.length !== 0) {
    if (nonLatestTags.length === 0) {
      throw new Error(`when latest tag is given, also non-latest tag must be given`)
    }
    for (const latestTag of latestTags) {
      const image = latestTag.replace(/:latest$/, '')
      const nonLatestTag = nonLatestTags.find((tag) => tag.startsWith(image))
      if (!nonLatestTag) {
        throw new Error(`when latest tag is given, also non-latest tag must be given`)
      }
      const sourceManifests = getSourceManifests(nonLatestTag, inputs.suffixes)
      await pushManifest(latestTag, sourceManifests, builder)
      core.info(`Pushed a manifest ${latestTag}`)
    }
  }
}

type BuilderName = 'buildx' | 'docker'

const determineBuilder = async (flag: string): Promise<BuilderName> => {
  core.startGroup('Checking if buildx is available')
  await exec.exec('docker', ['version'])
  const buildxIsAvailable = (await exec.exec('docker', ['buildx', 'version'], { ignoreReturnCode: true })) === 0
  core.endGroup()

  if (flag === 'buildx' || flag === 'docker') {
    return flag
  }
  if (flag === 'auto') {
    return buildxIsAvailable ? 'buildx' : 'docker'
  }
  throw new Error(`builder must be either auto, buildx or docker`)
}

export const getSourceManifests = (tag: string, suffixes: string[]) => suffixes.map((suffix) => `${tag}${suffix}`)

const pushManifest = async (destination: string, source: string[], builder: BuilderName) => {
  if (builder === 'buildx') {
    await exec.exec('docker', ['buildx', 'imagetools', 'create', '-t', destination, ...source])
    await exec.exec('docker', ['buildx', 'imagetools', 'inspect', destination])
    return
  }

  await exec.exec('docker', ['manifest', 'create', destination, ...source])
  await exec.exec('docker', ['manifest', 'push', destination])
  await exec.exec('docker', ['manifest', 'inspect', destination])
}
