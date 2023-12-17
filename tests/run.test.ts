import * as exec from '@actions/exec'
import { run } from '../src/run'

jest.mock('@actions/exec')

beforeEach(() => jest.mocked(exec).exec.mockResolvedValue(0))

it('should run docker buildx imagetools', async () => {
  jest.mocked(exec).getExecOutput.mockResolvedValue({
    exitCode: 0,
    stdout: '"sha256:f000000000000000000000000000000000000000000000000000000000000000"',
    stderr: '',
  })

  const outputs = await run({
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
