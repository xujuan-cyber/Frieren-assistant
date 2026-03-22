# Text-to-Image Workspace

Route: `/#/image/text2image`

Use this workspace when you want to generate images from text only, with no reference image.

## First-time rule of thumb

If both are true, this is usually the right page:

1. your final output is an image, not text
2. you only have a text prompt, with no input image

## Typical use cases

- poster, illustration, cover, or character-concept prompts
- comparing how `original / workspace / vN` changes image output
- comparing the same prompt on different image models

If you already have an input image, use [Image-to-Image Workspace](image2image-workspace.md).

## If you only want the fastest start

1. write the image prompt on the left
2. run one left-side analysis or optimization
3. keep one image model fixed on the right
4. compare `original / workspace / vN` through real images

## What the left side edits

The left side edits the **image prompt itself**.

The left side uses a text model, not an image model.

## What the right side tests

The right side tests:

- one prompt version
- one image model
- the real generated image

## Recommended workflow

1. write the original image prompt
2. optimize or analyze it once on the left
3. keep one image model fixed and compare `original / workspace / vN`
4. select the better prompt version
5. then keep that version fixed and compare image models

## Related pages

- [Image-to-Image Workspace](image2image-workspace.md)
- [Model Management](../basic/models.md)
- [Model Testing Strategy](../user/model-testing-strategy.md)
