import * as core from '@actions/core'
import * as exec from '@actions/exec'

type Inputs = {
  tags: string[]
  sources: string[]
}

type Outputs = {
  digest: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  core.startGroup('Buildx version')
  await exec.exec('docker', ['buildx', 'version'])
  core.endGroup()

  for (const tag of inputs.tags) {
    await createManifest(tag, inputs.sources)
  }

  const digest = await getDigest(inputs.tags[0])
  return { digest }
}

const createManifest = async (destination: string, sources: string[]) => {
  await exec.exec('docker', ['buildx', 'imagetools', 'create', '-t', destination, ...sources])
  await exec.exec('docker', ['buildx', 'imagetools', 'inspect', destination])
}

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
