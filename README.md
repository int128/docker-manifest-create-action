# docker-manifest-create-action [![ts](https://github.com/int128/docker-manifest-create-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/docker-manifest-create-action/actions/workflows/ts.yaml)

This is an action to create a multi-architecture Docker image in GitHub Actions.
It is interoperable with [docker/build-push-action](https://github.com/docker/build-push-action) and [docker/metadata-action](https://github.com/docker/metadata-action).

## Purpose

When we build a multi-architecture image using [docker/build-push-action](https://github.com/docker/build-push-action), it takes a long time to build all platforms in a single job.

It would be nice to build images in parallel jobs and finally create a multi-architecture image.

```mermaid
graph LR
  m[Image ghcr.io/owner/repo:tag]
  amd64[Image ghcr.io/owner/repo:tag-linux-amd64] --> m
  arm64[Image ghcr.io/owner/repo:tag-linux-arm64] --> m
  ppc64le[Image ghcr.io/owner/repo:tag-linux-ppc64le] --> m
```

This action runs the following commands to create a multi-architecture image:

- [`docker manifest create`](https://docs.docker.com/engine/reference/commandline/manifest_create/)
- [`docker manifest push`](https://docs.docker.com/engine/reference/commandline/manifest_push/)

For example, when the following inputs are given,

```yaml
tags: ghcr.io/owner/repo:tag
suffixes: |
  -linux-amd64
  -linux-arm64
  -linux-ppc64le
```

this action runs the following commands:

```sh
# create a manifest of multi-architecture image
docker manifest create ghcr.io/owner/repo:tag \
  ghcr.io/owner/repo:tag-linux-amd64 \
  ghcr.io/owner/repo:tag-linux-arm64 \
  ghcr.io/owner/repo:tag-linux-ppc64le

# push the manifest to the remote repository
docker manifest push owner/repo:tag
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

Here is a diagram of this workflow:

```mermaid
graph TB
  subgraph Workflow
    amd64[build linux/amd64] --> build-multi-architecture
    arm64[build linux/arm64] --> build-multi-architecture
    build-multi-architecture
  end
```

When `v1.0.0` tag is pushed, `build` job creates the following images by default of [docker/metadata-action](https://github.com/docker/metadata-action):

- `ghcr.io/owner/repo:v1.0.0-linux-amd64`
- `ghcr.io/owner/repo:v1.0.0-linux-arm64`
- `ghcr.io/owner/repo:latest-linux-amd64`
- `ghcr.io/owner/repo:latest-linux-arm64`

Finally, `build-multi-architecture` job creates the following images:

- `ghcr.io/owner/repo:v1.0.0`
- `ghcr.io/owner/repo:latest`

See also [the workflow of e2e test](.github/workflows/e2e.yaml) with cache options.

## Specification

### Inputs

| Name | Default | Description
|------|----------|------------
| `tags` | (required) | tags of destination images (multi-line string)
| `suffixes` | (required) | suffixes of source images (multi-line string)

### Outputs

Nothing.

### Behavior

This action runs the following commands for each tag.

```sh
docker manifest create {tag} {tag}{suffix}...
docker manifest push {tag}
```
