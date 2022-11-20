# docker-manifest-create-action [![ts](https://github.com/int128/docker-manifest-create-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/docker-manifest-create-action/actions/workflows/ts.yaml)

This is an action to create a multi-architecture image in GitHub Actions.
It runs [`docker manifest`](https://docs.docker.com/engine/reference/commandline/manifest/) commands.

## Purpose

[`docker buildx build`](https://docs.docker.com/engine/reference/commandline/buildx_build/#platform) command supports multiple platforms, but it takes a long time to build multiple platforms in a single job.

It would be nice to build multiple images for platforms in parallel.
For example,

```yaml
jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        platform:
          - linux/amd64
          - linux/arm64
    steps:
      - uses: docker/metadata-action@v4
        id: metadata
        with:
          images: ghcr.io/int128/example
          flavor: suffix=-${{ matrix.platform }}
      - uses: docker/setup-buildx-action@v2
      - uses: docker/build-push-action@v3
        with:
          tags: ${{ steps.metadata.outputs.tags }}
          platforms: ${{ matrix.platform }}
```

When `v1.0.0` tag is pushed, the build job will create the following images:

- `ghcr.io/int128/example:v1.0.0-linux-amd64`
- `ghcr.io/int128/example:v1.0.0-linux-arm64`
- `ghcr.io/int128/example:latest-linux-amd64`
- `ghcr.io/int128/example:latest-linux-arm64`

This is the default behavior of [docker/metadata-action](https://github.com/docker/metadata-action) and you can change it.

After the build job, create a multi-architecture image from all images.
For example,

```sh
docker manifest create ghcr.io/int128/example:v1.0.0 \
  ghcr.io/int128/example:v1.0.0-amd64 \
  ghcr.io/int128/example:v1.0.0-arm64

docker manifest push ghcr.io/int128/example:v1.0.0
```

This action allows it by a simple step without any scripting.

```yaml
      - uses: int128/docker-manifest-create-action@v1
        with:
          tags: ${{ steps.metadata.outputs.tags }}
          suffixes: |
            -linux-amd64
            -linux-arm64
```

See also the following docs:

- [Create and push a manifest list](https://docs.docker.com/engine/reference/commandline/manifest/#create-and-push-a-manifest-list) (Docker)
- [Pushing a multi-architecture image](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-multi-architecture-image.html) (Amazon ECR)

## Getting Started

Here is an example of workflow to build a multi-architecture image for `amd64` and `arm64`.

```yaml
jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        platform:
          - linux/amd64
          - linux/arm64
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v4
        id: metadata
        with:
          images: ghcr.io/${{ github.repository }}
          flavor: suffix=-${{ matrix.platform }}
      - uses: docker/setup-buildx-action@v2
      - uses: docker/build-push-action@v3
        with:
          push: true
          tags: ${{ steps.metadata.outputs.tags }}
          labels: ${{ steps.metadata.outputs.labels }}
          platforms: ${{ matrix.platform }}

  build-multi-architecture:
    needs:
      - build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v4
        id: metadata
        with:
          images: ghcr.io/${{ github.repository }}
      - uses: int128/docker-manifest-create-action@v1
        with:
          tags: ${{ steps.metadata.outputs.tags }}
          suffixes: |
            -linux-amd64
            -linux-arm64
```

See also [the full example of e2e test](.github/workflows/e2e.yaml).

## Specification

### Inputs

| Name | Default | Description
|------|----------|------------
| `tags` | (required) | tags of destination images (multi-line string)
| `suffixes` | (required) | suffixes of source images (multi-line string)

### Outputs

Nothing.
