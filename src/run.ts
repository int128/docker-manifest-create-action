import * as core from '@actions/core'
import * as exec from '@actions/exec'

type Inputs = {
  tags: string[]
  suffixes: string[]
  useBuildx: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  if (inputs.suffixes.length < 1) {
    throw new Error(`one or more suffixes must be set`)
  }

  const useBuildx = await determineUseBuildx(inputs.useBuildx)
  core.info(`Using ${useBuildx ? 'buildx' : 'docker'} command`)

  const nonLatestTags = inputs.tags.filter((tag) => !tag.endsWith(':latest'))
  const latestTag = inputs.tags.find((tag) => tag.endsWith(':latest'))
  for (const tag of nonLatestTags) {
    const sourceManifests = getSourceManifests(tag, inputs.suffixes)
    await pushManifest(tag, sourceManifests, useBuildx)
    core.info(`Pushed a manifest ${tag}`)
  }

  if (latestTag) {
    if (nonLatestTags.length === 0) {
      throw new Error(`when latest tag is given, also non-latest tag must be given`)
    }
    const nonLatestTag = nonLatestTags[0]
    const sourceManifests = getSourceManifests(nonLatestTag, inputs.suffixes)
    await pushManifest(latestTag, sourceManifests, useBuildx)
    core.info(`Pushed a manifest ${latestTag}`)
  }
}

const determineUseBuildx = async (flag: string): Promise<boolean> => {
  core.startGroup('Checking if docker buildx is available')
  await exec.exec('docker', ['version'])
  const buildxIsAvailable = (await exec.exec('docker', ['buildx', 'version'], { ignoreReturnCode: true })) === 0
  core.endGroup()

  switch (flag) {
    case 'auto':
      return buildxIsAvailable
    case 'true':
      return true
    case 'false':
      return false
  }
  throw new Error(`buildx must be either auto, true or false`)
}

export const getSourceManifests = (tag: string, suffixes: string[]) => suffixes.map((suffix) => `${tag}${suffix}`)

const pushManifest = async (destination: string, source: string[], buildx: boolean) => {
  if (buildx) {
    await exec.exec('docker', ['buildx', 'imagetools', 'create', '-t', destination, ...source])
    await exec.exec('docker', ['buildx', 'imagetools', 'inspect', destination])
    return
  }

  await exec.exec('docker', ['manifest', 'create', destination, ...source])
  await exec.exec('docker', ['manifest', 'push', destination])
  await exec.exec('docker', ['manifest', 'inspect', destination])
}
