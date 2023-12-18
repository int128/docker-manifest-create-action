import assert from 'assert'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

type Inputs = {
  push: boolean
  labels: string[]
  tags: string[]
  sources: string[]
}

type Outputs = {
  digest: string | undefined
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  core.startGroup('Buildx version')
  await exec.exec('docker', ['buildx', 'version'])
  core.endGroup()

  // https://docs.docker.com/engine/reference/commandline/buildx_imagetools_create/#annotation
  const annotations = inputs.labels.map((l) => `index:${l}`)

  if (!inputs.push) {
    await dryRunCreateManifest(inputs.sources, annotations)
    return { digest: undefined }
  }

  assert(inputs.tags.length > 0, 'tags must be set')
  for (const tag of inputs.tags) {
    await createManifest(tag, inputs.sources, annotations)
  }
  const digest = await getDigest(inputs.tags[0])
  return { digest }
}

const dryRunCreateManifest = async (sources: string[], annotations: string[]) => {
  await exec.exec('docker', [
    'buildx',
    'imagetools',
    'create',
    '--dry-run',
    ...toAnnotationFlags(annotations),
    ...sources,
  ])
}

const createManifest = async (destination: string, sources: string[], annotations: string[]) => {
  await exec.exec('docker', [
    'buildx',
    'imagetools',
    'create',
    ...toAnnotationFlags(annotations),
    '-t',
    destination,
    ...sources,
  ])
  await exec.exec('docker', ['buildx', 'imagetools', 'inspect', destination])
}

const toAnnotationFlags = (annotations: string[]): string[] => annotations.flatMap((a) => ['--annotation', a])

const getDigest = async (tag: string): Promise<string> => {
  const { stdout } = await exec.getExecOutput('docker', [
    'buildx',
    'imagetools',
    'inspect',
    '--format',
    '{{json .Manifest.Digest}}',
    tag,
  ])
  return stdout.replace(/^"|"$/g, '')
}
