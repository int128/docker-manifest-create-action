import { getSourceManifests } from '../src/run'

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
