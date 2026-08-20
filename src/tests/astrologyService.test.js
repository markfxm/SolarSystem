import test from 'node:test'
import assert from 'node:assert/strict'

const { AstrologyService, ASPECT_TYPE_TO_ID, ELEMENTS, createAspectDirtyChecker } = await import('../utils/AstrologyService.js')

test('AstrologyService exports ASPECT_TYPE_TO_ID and pre-calculates elementIndex', () => {
  assert.equal(ASPECT_TYPE_TO_ID.CONJUNCTION, 0)
  assert.equal(ASPECT_TYPE_TO_ID.OPPOSITION, 1)
  assert.equal(ASPECT_TYPE_TO_ID.TRINE, 2)
  assert.equal(ASPECT_TYPE_TO_ID.SQUARE, 3)
  assert.equal(ASPECT_TYPE_TO_ID.SEXTILE, 4)

  const signInfo = AstrologyService.getSignAndDegree(0)
  assert.equal(signInfo.elementIndex, signInfo.index & 3)
  assert.equal(ELEMENTS[signInfo.elementIndex], 'fire')

  const taurusInfo = AstrologyService.getSignAndDegree(30)
  assert.equal(taurusInfo.elementIndex, 1)
  assert.equal(ELEMENTS[taurusInfo.elementIndex], 'earth')
})

test('aspect dirty checker grows beyond its initial capacity without throwing', () => {
  const checker = createAspectDirtyChecker(2)
  const aspects = Array.from({ length: 3 }, (_, index) => ({
    p1: index === 0 ? 'sun' : 'moon',
    p2: 'mars',
    aspect: { type: 'CONJUNCTION', orb: 0 }
  }))

  assert.equal(checker.hasChanged(aspects), true)
  assert.equal(checker.hasChanged(aspects), false)
})
