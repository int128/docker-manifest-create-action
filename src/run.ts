import assert from 'assert'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

type Inputs = {
  push: boolean
  indexAnnotations: string[]
  tags: string[]
  sources: string[]
  maxRetries: number
  baseDelay: number
}

type Outputs = {
  digest: string | undefined
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  core.startGroup('Buildx version')
  await exec.exec('docker', ['buildx', 'version'])
  core.endGroup()

  if (!inputs.push) {
    await dryRunCreateManifest(inputs.sources, inputs.indexAnnotations)
    return { digest: undefined }
  }

  assert(inputs.tags.length > 0, 'tags must be set')
  for (const tag of inputs.tags) {
    await createManifest(tag, inputs.sources, inputs.indexAnnotations)
  }
  const digest = await getDigest(inputs.tags[0], inputs.maxRetries, inputs.baseDelay)
  return { digest }
}

const dryRunCreateManifest = async (sources: string[], indexAnnotations: string[]) => {
  await exec.exec('docker', [
    'buildx',
    'imagetools',
    'create',
    '--dry-run',
    ...toAnnotationFlags(indexAnnotations),
    ...sources,
  ])
}

const createManifest = async (destination: string, sources: string[], indexAnnotations: string[]) => {
  await exec.exec('docker', [
    'buildx',
    'imagetools',
    'create',
    ...toAnnotationFlags(indexAnnotations),
    '-t',
    destination,
    ...sources,
  ])
  await exec.exec('docker', ['buildx', 'imagetools', 'inspect', destination])
}

const toAnnotationFlags = (indexAnnotations: string[]): string[] =>
  indexAnnotations.flatMap((a) => [
    '--annotation',
    // https://docs.docker.com/engine/reference/commandline/buildx_imagetools_create/#annotation
    `index:${a}`,
  ])

const getDigest = async (tag: string, maxRetries = 5, baseDelay = 2000): Promise<string> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { stdout } = await exec.getExecOutput('docker', [
        'buildx',
        'imagetools',
        'inspect',
        '--format',
        '{{json .Manifest.Digest}}',
        tag,
      ])
      return stdout.replace(/^"|"$/g, '')
    } catch (err) {
      if (attempt === maxRetries) {
        throw err
      }
      const delay = baseDelay * Math.pow(2, attempt - 1)
      core.info(`Retry ${attempt}/${maxRetries} failed. Waiting ${delay}ms...`)
      await new Promise(res => setTimeout(res, delay))
    }
  }
  throw new Error(`Failed to inspect image digest for ${tag}`)
}
