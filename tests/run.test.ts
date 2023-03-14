import * as exec from '@actions/exec'
import { getSourceManifests, run } from '../src/run'

jest.mock('@actions/exec')

describe('run', () => {
  test('push a branch', async () => {
    await run({
      tags: ['ghcr.io/int128/docker-manifest-create-action:main'],
      suffixes: ['-amd64', '-arm64'],
      useBuildx: 'auto',
    })
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'create',
      'ghcr.io/int128/docker-manifest-create-action:main',
      'ghcr.io/int128/docker-manifest-create-action:main-amd64',
      'ghcr.io/int128/docker-manifest-create-action:main-arm64',
    ])
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'push',
      'ghcr.io/int128/docker-manifest-create-action:main',
    ])
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'inspect',
      'ghcr.io/int128/docker-manifest-create-action:main',
    ])
  })

  test('push a tag with latest', async () => {
    await run({
      tags: [
        'ghcr.io/int128/docker-manifest-create-action:v1.0.0',
        'ghcr.io/int128/docker-manifest-create-action:latest',
      ],
      suffixes: ['-amd64'],
      useBuildx: 'auto',
    })

    // non-latest tag
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'create',
      'ghcr.io/int128/docker-manifest-create-action:v1.0.0',
      'ghcr.io/int128/docker-manifest-create-action:v1.0.0-amd64',
    ])
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'push',
      'ghcr.io/int128/docker-manifest-create-action:v1.0.0',
    ])
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'inspect',
      'ghcr.io/int128/docker-manifest-create-action:v1.0.0',
    ])

    // latest tag
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'create',
      'ghcr.io/int128/docker-manifest-create-action:latest',
      'ghcr.io/int128/docker-manifest-create-action:v1.0.0-amd64',
    ])
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'push',
      'ghcr.io/int128/docker-manifest-create-action:latest',
    ])
    expect(exec.exec).toHaveBeenCalledWith('docker', [
      'manifest',
      'inspect',
      'ghcr.io/int128/docker-manifest-create-action:latest',
    ])
  })
})

describe('getSourceManifests', () => {
  test('a suffix', () => {
    expect(getSourceManifests('ghcr.io/int128/docker-manifest-create-action:pr-1', ['-amd64'])).toStrictEqual([
      'ghcr.io/int128/docker-manifest-create-action:pr-1-amd64',
    ])
  })

  test('suffixes', () => {
    expect(
      getSourceManifests('ghcr.io/int128/docker-manifest-create-action:pr-1', ['-amd64', '-arm64', '-ppc64le'])
    ).toStrictEqual([
      'ghcr.io/int128/docker-manifest-create-action:pr-1-amd64',
      'ghcr.io/int128/docker-manifest-create-action:pr-1-arm64',
      'ghcr.io/int128/docker-manifest-create-action:pr-1-ppc64le',
    ])
  })
})
