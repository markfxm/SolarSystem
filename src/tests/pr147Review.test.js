import test from 'node:test'
import assert from 'node:assert/strict'
import { computeElements, computePosition } from '../utils/Astronomy.js'

function solveKepler(M, e) {
  let E = M + e * Math.sin(M)

  for (let iter = 0; iter < 10; iter++) {
    const error = E - e * Math.sin(E) - M
    E -= error / (1 - e * Math.cos(E))
  }

  return E
}

test('mean anomaly stays normalized for very large simulation dates', () => {
  const elements = computeElements('mercury', 1e12, {}, 1)

  assert.ok(elements.M >= -Math.PI)
  assert.ok(elements.M <= Math.PI)
})

test('Kepler warm start stays on the normalized branch across the two-pi boundary', () => {
  const e = 0.205635
  const lastM = Math.PI - 0.001
  const elements = {
    e,
    M: -Math.PI + 0.001,
    lastM,
    lastE: solveKepler(lastM, e),
    PxA: 1,
    PyA: 0,
    PzA: 0,
    QxAS: 0,
    QyAS: 0,
    QzAS: 0,
    aScaled: 1
  }
  const originalSin = Math.sin
  let sinCalls = 0

  Math.sin = angle => {
    sinCalls++
    return originalSin(angle)
  }

  try {
    computePosition(elements, {})
  } finally {
    Math.sin = originalSin
  }

  assert.ok(Math.abs(elements.lastE) <= Math.PI)
  assert.ok(sinCalls <= 2, `expected warm start to converge within 2 sin calls, got ${sinCalls}`)
})
