import test from 'node:test'
import assert from 'node:assert/strict'

import {
  collectLeafPaths,
  diffLocaleShape,
  isPlainObject,
} from './check-locale-parity.mjs'

test('isPlainObject identifies plain objects only', () => {
  assert.equal(isPlainObject({ a: 1 }), true)
  assert.equal(isPlainObject(['a']), false)
  assert.equal(isPlainObject(null), false)
  assert.equal(isPlainObject('x'), false)
})

test('collectLeafPaths flattens nested message keys', () => {
  assert.deepEqual(
    collectLeafPaths({
      common: {
        save: 'Save',
        buttons: {
          cancel: 'Cancel',
        },
      },
    }),
    ['common.buttons.cancel', 'common.save'],
  )
})

test('diffLocaleShape reports missing, extra, and type mismatches', () => {
  const base = {
    common: {
      save: 'Save',
      nested: {
        title: 'Title',
      },
    },
  }

  const candidate = {
    common: {
      nested: 'wrong-shape',
      extra: 'Extra',
    },
  }

  assert.deepEqual(diffLocaleShape(base, candidate), {
    extra: ['common.extra'],
    missing: ['common.save'],
    mismatched: ['common.nested'],
  })
})
