# docker-manifest-create-action [![ts](https://github.com/int128/docker-manifest-create-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/docker-manifest-create-action/actions/workflows/ts.yaml)

This is an action to create a multi-architecture Docker image in GitHub Actions.
It is interoperable with [docker/metadata-action](https://github.com/docker/metadata-action).

## Migration from V1 to V2

This action is a thin wrapper of `docker buildx imagetools create`.
You need to set an image URI instead of a tag element.

If you use `docker/build-push-action`, you can construct an image URI from the outputs.
For example,

```yaml
- uses: docker/build-push-action@v5
  id: build-amd64
  with: # ...omit...
- uses: docker/build-push-action@v5
  id: build-arm64
  with: # ...omit...

- uses: int128/docker-manifest-create-action@v2
  with:
    tags: ghcr.io/${{ github.repository }}:main
    sources: |
      ghcr.io/${{ github.repository }}@${{ steps.build-amd64.outputs.digest }}
      ghcr.io/${{ github.repository }}@${{ steps.build-arm64.outputs.digest }}
```

## Getting Started

When we build a multi-architecture image using [docker/build-push-action](https://github.com/docker/build-push-action), it takes a long time to build all platforms in a single job.
It would be nice to build images in parallel and finally create a multi-architecture image from them.

```mermaid
graph LR
  m[Image ghcr.io/owner/repo:tag]
  amd64[Image ghcr.io/owner/repo:tag-linux-amd64] --> m
  arm64[Image ghcr.io/owner/repo:tag-linux-arm64] --> m
  ppc64le[Image ghcr.io/owner/repo:tag-linux-ppc64le] --> m
```

We can create a multi-architecture image by the below commands.

```sh
# push a manifest of multi-architecture image
docker buildx imagetools create -t ghcr.io/owner/repo:tag \
  ghcr.io/owner/repo@sha256:0000000000000000000000000000000000000000000000000000000000000001 \
  ghcr.io/owner/repo@sha256:0000000000000000000000000000000000000000000000000000000000000002 \
  ghcr.io/owner/repo@sha256:0000000000000000000000000000000000000000000000000000000000000003

# verify the manifest
docker buildx imagetools inspect owner/repo:tag
```

This action runs the above commands for each tag.

```yaml
- uses: int128/docker-manifest-create-action@v2
  with:
    tags: |
      ghcr.io/owner/repo:tag
    sources: |
      ghcr.io/owner/repo@sha256:0000000000000000000000000000000000000000000000000000000000000001
      ghcr.io/owner/repo@sha256:0000000000000000000000000000000000000000000000000000000000000002
      ghcr.io/owner/repo@sha256:0000000000000000000000000000000000000000000000000000000000000003
```

See also the following docs:

- [`docker buildx imagetools create`](https://docs.docker.com/engine/reference/commandline/buildx_imagetools_create/)
- [Create and push a manifest list](https://docs.docker.com/engine/reference/commandline/manifest/#create-and-push-a-manifest-list) (Docker)
- [Pushing a multi-architecture image](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-multi-architecture-image.html) (Amazon ECR)

## Examples

### Basic usage

Here is an example workflow to build a multi-architecture image for `linux/amd64` and `linux/arm64`.

```yaml
jobs:
  build-linux-amd64:
    uses: ./.github/workflows/reusable--docker-build.yaml
    with:
      images: ghcr.io/${{ github.repository }}
      platforms: linux/amd64

  build-linux-arm64:
    uses: ./.github/workflows/reusable--docker-build.yaml
    with:
      images: ghcr.io/${{ github.repository }}
      platforms: linux/arm64

  build:
    needs:
      - build-linux-amd64
      - build-linux-arm64
    runs-on: ubuntu-latest
    timeout-minutes: 10
    outputs:
      image-uri: ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
    steps:
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: metadata
        with:
          images: ghcr.io/${{ github.repository }}
      - uses: int128/docker-manifest-create-action@v2
        id: build
        with:
          tags: ${{ steps.metadata.outputs.tags }}
          sources: |
            ghcr.io/${{ github.repository }}@${{ needs.build-linux-amd64.outputs.digest }}
            ghcr.io/${{ github.repository }}@${{ needs.build-linux-arm64.outputs.digest }}
```

Here is the diagram of this workflow.

```mermaid
graph TB
  subgraph Workflow
    build-linux-amd64 --> build
    build-linux-arm64 --> build
  end
```

For details, see the following workflows:

- [`.github/workflows/e2e-docker.yaml`](.github/workflows/e2e-docker.yaml)
- [`.github/workflows/reusable--docker-build.yaml`](.github/workflows/reusable--docker-build.yaml)
- [`.github/workflows/e2e-kaniko.yaml`](.github/workflows/e2e-kaniko.yaml)

### Native build on self-hosted runners

If you are using the self-hosted runners, you can build an image faster.
For example, you can natively build an `arm64` image on AWS Graviton 2.

Here is an example workflow.

```yaml
jobs:
  build-linux-amd64:
    uses: ./.github/workflows/reusable--docker-build.yaml
    with:
      runs-on: self-hosted-amd64

  build-linux-arm64:
    uses: ./.github/workflows/reusable--docker-build.yaml
    with:
      runs-on: self-hosted-arm64

  build:
    needs:
      - build-linux-amd64
      - build-linux-arm64
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
      id-token: write
    outputs:
      image-uri: ${{ steps.ecr.outputs.registry }}/${{ github.repository }}@${{ steps.build.outputs.digest }}
    steps:
      - uses: aws-actions/configure-aws-credentials@v3
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/ROLE
      - uses: aws-actions/amazon-ecr-login@v3
        id: ecr
      - uses: docker/metadata-action@v5
        id: metadata
        with:
          images: ${{ steps.ecr.outputs.registry }}/${{ github.repository }}
      - uses: int128/docker-manifest-create-action@v2
        id: build
        with:
          tags: ${{ steps.metadata.outputs.tags }}
          sources: |
            ${{ steps.ecr.outputs.registry }}/${{ github.repository }}@${{ needs.build-linux-amd64.outputs.digest }}
            ${{ steps.ecr.outputs.registry }}/${{ github.repository }}@${{ needs.build-linux-arm64.outputs.digest }}
```

## Specification

### Inputs

| Name      | Default    | Description                                    |
| --------- | ---------- | ---------------------------------------------- |
| `tags`    | (required) | Tags of destination images (multi-line string) |
| `sources` | (required) | Image URIs of sources (multi-line string)      |

### Outputs

| Name     | Description                    |
| -------- | ------------------------------ |
| `digest` | Digest of the created manifest |
