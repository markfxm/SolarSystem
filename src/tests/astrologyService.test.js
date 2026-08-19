import test from 'node:test'
import assert from 'node:assert/strict'

const { AstrologyService, ASPECT_TYPE_TO_ID, ELEMENTS } = await import('../utils/AstrologyService.js')

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
