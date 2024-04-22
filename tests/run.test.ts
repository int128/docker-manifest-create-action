import * as exec from '@actions/exec'
import { run } from '../src/run.js'

jest.mock('@actions/exec')

beforeEach(() => jest.mocked(exec).exec.mockResolvedValue(0))

it('should run docker buildx imagetools', async () => {
  jest.mocked(exec).getExecOutput.mockResolvedValue({
    exitCode: 0,
    stdout: '"sha256:f000000000000000000000000000000000000000000000000000000000000000"',
    stderr: '',
  })

  const outputs = await run({
    push: true,
    indexAnnotations: [],
    tags: ['ghcr.io/int128/docker-manifest-create-action:main'],
    sources: [
      'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000000',
      'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000001',
    ],
  })
  expect(outputs).toStrictEqual({
    digest: 'sha256:f000000000000000000000000000000000000000000000000000000000000000',
  })

  expect(exec.exec).toHaveBeenCalledWith('docker', [
    'buildx',
    'imagetools',
    'create',
    '-t',
    'ghcr.io/int128/docker-manifest-create-action:main',
    'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000000',
    'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000001',
  ])
  expect(exec.exec).toHaveBeenCalledWith('docker', [
    'buildx',
    'imagetools',
    'inspect',
    'ghcr.io/int128/docker-manifest-create-action:main',
  ])
})

it('should run docker buildx imagetools --dry-run if push is false', async () => {
  const outputs = await run({
    push: false,
    indexAnnotations: [],
    tags: [],
    sources: [
      'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000000',
      'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000001',
    ],
  })
  expect(outputs).toStrictEqual({ digest: undefined })

  expect(exec.exec).toHaveBeenCalledWith('docker', [
    'buildx',
    'imagetools',
    'create',
    '--dry-run',
    'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000000',
    'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000001',
  ])
})

it('should add annotations', async () => {
  jest.mocked(exec).getExecOutput.mockResolvedValue({
    exitCode: 0,
    stdout: '"sha256:f000000000000000000000000000000000000000000000000000000000000000"',
    stderr: '',
  })

  const outputs = await run({
    push: true,
    indexAnnotations: [
      'org.opencontainers.image.revision=0123456789012345678901234567890123456789',
      'org.opencontainers.image.created=2021-01-01T00:00:00Z',
    ],
    tags: ['ghcr.io/int128/docker-manifest-create-action:main'],
    sources: [
      'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000000',
    ],
  })
  expect(outputs).toStrictEqual({
    digest: 'sha256:f000000000000000000000000000000000000000000000000000000000000000',
  })

  expect(exec.exec).toHaveBeenCalledWith('docker', [
    'buildx',
    'imagetools',
    'create',
    '--annotation',
    'index:org.opencontainers.image.revision=0123456789012345678901234567890123456789',
    '--annotation',
    'index:org.opencontainers.image.created=2021-01-01T00:00:00Z',
    '-t',
    'ghcr.io/int128/docker-manifest-create-action:main',
    'ghcr.io/int128/docker-manifest-create-action@sha256:0000000000000000000000000000000000000000000000000000000000000000',
  ])
  expect(exec.exec).toHaveBeenCalledWith('docker', [
    'buildx',
    'imagetools',
    'inspect',
    'ghcr.io/int128/docker-manifest-create-action:main',
  ])
})
