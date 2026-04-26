import { describe, expect, it } from 'vitest'

import {
  applyFavoriteReproducibilityToMetadata,
  parseFavoriteReproducibilityFromMetadata,
} from '../../../src/utils/favorite-reproducibility'

describe('favorite-reproducibility', () => {
  it('parses Prompt Garden variables and examples from metadata', () => {
    const repro = parseFavoriteReproducibilityFromMetadata({
      gardenSnapshot: {
        variables: [
          {
            name: 'style',
            defaultValue: 'watercolor',
            required: true,
            description: 'Rendering style',
          },
        ],
        assets: {
          examples: [
            {
              id: 'example-1',
              parameters: {
                style: 'ink',
              },
              inputImages: ['https://example.com/input.png'],
            },
          ],
        },
      },
    })

    expect(repro.source).toBe('garden')
    expect(repro.variableCount).toBe(1)
    expect(repro.exampleCount).toBe(1)
    expect(repro.hasInputImages).toBe(true)
    expect(repro.variables[0]).toMatchObject({
      name: 'style',
      defaultValue: 'watercolor',
      required: true,
    })
    expect(repro.examples[0]?.parameters).toEqual({ style: 'ink' })
  })

  it('updates Prompt Garden reproducibility without dropping unrelated metadata', () => {
    const metadata = {
      modelKey: 'model-a',
      gardenSnapshot: {
        importCode: 'abc',
        assets: {
          cover: {
            assetId: 'cover-1',
          },
        },
      },
    }

    const next = applyFavoriteReproducibilityToMetadata(metadata, {
      variables: [
        {
          name: 'theme',
          required: false,
          defaultValue: 'forest',
          options: ['forest', 'city'],
        },
      ],
      examples: [
        {
          id: 'sample',
          parameters: {
            theme: 'city',
          },
          images: [],
          imageAssetIds: [],
          inputImages: [],
          inputImageAssetIds: [],
        },
      ],
    })

    expect(next.modelKey).toBe('model-a')
    expect((next.gardenSnapshot as any).importCode).toBe('abc')
    expect((next.gardenSnapshot as any).assets.cover.assetId).toBe('cover-1')
    expect((next.gardenSnapshot as any).variables).toEqual([
      {
        name: 'theme',
        defaultValue: 'forest',
        options: ['forest', 'city'],
      },
    ])
    expect((next.gardenSnapshot as any).assets.examples).toEqual([
      {
        id: 'sample',
        parameters: {
          theme: 'city',
        },
      },
    ])
  })

  it('stores new non-Garden configuration under namespaced metadata', () => {
    const next = applyFavoriteReproducibilityToMetadata({}, {
      variables: [
        {
          name: 'audience',
          required: true,
          options: [],
        },
      ],
      examples: [],
    })

    expect(next).toEqual({
      reproducibility: {
        variables: [
          {
            name: 'audience',
            required: true,
          },
        ],
        examples: [],
      },
    })
  })
})
