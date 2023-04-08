import { promises as fs } from 'fs'
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
  const latestTag = inputs.tags.find((tag) => tag.endsWith(':latest'))
  for (const tag of nonLatestTags) {
    const sourceManifests = getSourceManifests(tag, inputs.suffixes)
    await pushManifest(tag, sourceManifests, builder)
    core.info(`Pushed a manifest ${tag}`)
  }

  if (latestTag) {
    if (nonLatestTags.length === 0) {
      throw new Error(`when latest tag is given, also non-latest tag must be given`)
    }
    const nonLatestTag = nonLatestTags[0]
    const sourceManifests = getSourceManifests(nonLatestTag, inputs.suffixes)
    await pushManifest(latestTag, sourceManifests, builder)
    core.info(`Pushed a manifest ${latestTag}`)
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
    // await exec.exec('docker', ['buildx', 'imagetools', 'create', '-t', destination, ...source])
    const { stdout: descriptor } = await exec.getExecOutput('docker', [
      'buildx',
      'imagetools',
      'inspect',
      '--format',
      '{{json .Manifest}}',
      destination,
    ])
    // TODO: fix
    // https://github.com/opencontainers/image-spec/blob/main/descriptor.md#properties
    const descriptorObject = JSON.parse(descriptor) as Record<string, unknown>
    descriptorObject['annotations'] = {
      'org.opencontainers.image.url': 'https://github.com/int128/docker-manifest-create-action',
      'org.opencontainers.image.source': 'https://github.com/int128/docker-manifest-create-action',
      'org.opencontainers.image.title': 'docker-manifest-create-action',
      'org.opencontainers.image.revision': process.env['GITHUB_SHA'],
      'org.opencontainers.image.created': '2023-04-05T00:00:00.309Z',
      'org.opencontainers.image.version': 'pr-999',
      'org.opencontainers.image.description': 'Create a multi-architecture Docker image in GitHub Actions',
      'org.opencontainers.image.licenses': 'Apache-2.0',
    }
    core.info(JSON.stringify(descriptorObject, undefined, 2))
    await fs.writeFile('descriptor.json', JSON.stringify(descriptorObject))
    await exec.exec('docker', ['buildx', 'imagetools', 'create', '-t', destination, JSON.stringify(descriptorObject)])
    await exec.exec('docker', ['buildx', 'imagetools', 'inspect', '--format', '{{json .Manifest}}', destination])
    return
  }

  await exec.exec('docker', ['manifest', 'create', destination, ...source])
  await exec.exec('docker', ['manifest', 'push', destination])
  await exec.exec('docker', ['manifest', 'inspect', destination])
}
