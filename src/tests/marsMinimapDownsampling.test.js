import test from 'node:test'
import assert from 'node:assert/strict'

function getSampledPathIndices(pathLength, expanded) {
  const startIdx = expanded ? 0 : Math.max(0, pathLength - 50)
  const count = pathLength - startIdx
  const step = count > 300 ? Math.ceil(count / 300) : 1

  const indices = []
  for (let i = startIdx; i < pathLength; i += step) {
    indices.push(i)
  }
  if (step > 1 && (pathLength - 1 - startIdx) % step !== 0) {
    indices.push(pathLength - 1)
  }
  return { startIdx, count, step, indices }
}

test('minimap path sampling: <= 300 points preserves full fidelity with step 1', () => {
  const resExpanded = getSampledPathIndices(200, true)
  assert.equal(resExpanded.step, 1)
  assert.equal(resExpanded.indices.length, 200)

  const resCollapsed = getSampledPathIndices(200, false)
  assert.equal(resCollapsed.startIdx, 150)
  assert.equal(resCollapsed.count, 50)
  assert.equal(resCollapsed.step, 1)
  assert.equal(resCollapsed.indices.length, 50)
})

test('minimap path sampling: > 300 points downsamples line drawing operations and connects last point', () => {
  // 1200 points expanded -> count = 1200, step = ceil(1200 / 300) = 4
  const res1200 = getSampledPathIndices(1200, true)
  assert.equal(res1200.step, 4)
  assert.ok(res1200.indices.length <= 301)
  assert.equal(res1200.indices[0], 0)
  assert.equal(res1200.indices.at(-1), 1199)

  // 1000 points expanded -> count = 1000, step = ceil(1000 / 300) = 4
  const res1000 = getSampledPathIndices(1000, true)
  assert.equal(res1000.step, 4)
  assert.equal(res1000.indices[0], 0)
  assert.equal(res1000.indices.at(-1), 999)
  assert.ok(res1000.indices.length <= 301)
})
