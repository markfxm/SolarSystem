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

test('findAspect and getMajorAspect use pre-computed priority and typeLower', () => {
  const aspect = AstrologyService.findAspect(0, 0)
  assert.notEqual(aspect, null)
  assert.equal(aspect.type, 'CONJUNCTION')
  assert.equal(aspect.typeLower, 'conjunction')
  assert.equal(aspect.priority, 1)

  const aspects = [
    { p1: 'sun', p2: 'moon', aspect: { orb: 2.0, priority: 3, type: 'SQUARE', typeLower: 'square' } },
    { p1: 'venus', p2: 'mars', aspect: { orb: 2.0, priority: 1, type: 'CONJUNCTION', typeLower: 'conjunction' } }
  ]

  const major = AstrologyService.getMajorAspect(aspects)
  assert.equal(major.p1, 'venus')
  assert.equal(major.p2, 'mars')

  const chart = {
    sun: { signId: 'aries' },
    moon: { signId: 'taurus' }
  }
  const guidance = AstrologyService.getCosmicGuidance(chart, major)
  assert.equal(guidance.strategyKey, 'conjunction')
  assert.equal(guidance.p1, 'venus')
  assert.equal(guidance.p2, 'mars')
})
