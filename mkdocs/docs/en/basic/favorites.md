# Favorites & Import

Favorites are best used for these jobs:

- saving prompt results that already proved reusable
- adding titles, descriptions, categories, and tags
- reusing content across different workspaces
- importing or exporting a selected collection without moving all data

Favorites are not the same thing as history.

## The simplest distinction

- **History**: version chains and working process
- **Favorites**: curated results you intentionally keep for reuse

## Where favorites live

There are two common entry types:

### Favorites manager in the top toolbar

Best for:

- search
- filtering
- browsing all favorites
- import and export
- category and tag management

### “Save to favorites” inside a workspace or result area

Best for saving the current content directly as a reusable item.

When saving, you can usually add:

- title
- description
- category
- tags
- workspace mode
- for image favorites, attached images and a cover image

## What the current favorites manager can do

Based on the current implementation, it supports:

- keyword search
- category filter
- tag filter
- grid browsing
- preview
- copy content
- use now
- edit
- delete
- import JSON
- export JSON
- clear all favorites
- category management
- tag management

## What happens when you click “Use now”

Favorites are not just plain text copies.

The current implementation tries to restore workspace semantics from the saved item:

- text favorites jump back to the matching `basic` or `pro` workspace
- if the favorite includes `system / user` meaning, the app also tries to restore the matching sub-mode
- image favorites jump back to text-to-image, image-to-image, or multi-image

So favorites behave more like a reusable entry with workspace context, not just a clipboard slot.

If a favorite was saved from the multi-image workflow, `Use now` also tries to restore that sub-mode and its media context so you do not need to rebuild the image set manually.

## How favorites and history should work together

A practical workflow is:

1. keep iterating in the left workspace
2. use history to preserve process versions
3. once something is stable enough, save it to favorites
4. later, reuse from favorites first, and only open history when you need to trace the process

## Favorites vs data management

### Use favorites import/export when

- you only want to move selected items
- you want to share a prompt collection
- you want to keep your main environment clean

### Use data management import/export when

- you need a full backup
- you need a full migration
- you want to move models, templates, and history together

## What else can be saved

The save-favorite dialog currently supports:

- title
- description
- category
- tags
- feature mode
- optimization mode for text workflows
- sub-mode for image workflows
- editing the main content
- image upload
- setting a cover image
- removing attached images

That means a favorite can preserve not just text, but also a small media set related to the prompt.

## About Prompt Garden

The current implementation also supports a pluggable preview area for favorites.

If your deployment enables `Prompt Garden` integration, a favorite preview can also show extra external snapshot information and media content.

This is an optional integration, so it may not appear in every deployment.

## Practical suggestions

- let history keep the process, and let favorites keep the result
- write titles your future self can still understand
- do not over-tag; use only the tags that help filtering
- for image favorites, set a clear cover image for easier browsing
- before sharing favorite JSON, check descriptions and media for sensitive information

## Related pages

- [History Management](history.md)
- [Data Management](data.md)
- [Quick Start](../user/quick-start.md)
