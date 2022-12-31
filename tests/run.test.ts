import { getSourceManifests } from '../src/run'

describe('getSourceManifests', () => {
  test('a suffix', () => {
    expect(
      getSourceManifests('ghcr.io/int128/docker-manifest-create-action:pr-1', { suffixes: ['-amd64'], digests: [] })
    ).toStrictEqual(['ghcr.io/int128/docker-manifest-create-action:pr-1-amd64'])
  })

  test('suffixes', () => {
    expect(
      getSourceManifests('ghcr.io/int128/docker-manifest-create-action:pr-1', {
        suffixes: ['-amd64', '-arm64', '-ppc64le'],
        digests: [],
      })
    ).toStrictEqual([
      'ghcr.io/int128/docker-manifest-create-action:pr-1-amd64',
      'ghcr.io/int128/docker-manifest-create-action:pr-1-arm64',
      'ghcr.io/int128/docker-manifest-create-action:pr-1-ppc64le',
    ])
  })

  test('a digest', () => {
    expect(
      getSourceManifests('ghcr.io/int128/docker-manifest-create-action:pr-1', {
        suffixes: [],
        digests: ['sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'],
      })
    ).toStrictEqual([
      'ghcr.io/int128/docker-manifest-create-action@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ])
  })
})
