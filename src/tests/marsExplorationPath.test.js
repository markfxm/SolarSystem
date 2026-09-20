import test from 'node:test'
import assert from 'node:assert/strict'
import { createMarsExplorationPath } from '../planets/Mars/MarsExplorationPath.js'

function storage(saved = null) {
  return { value: saved, writes: 0,
    getItem() { return this.value },
    setItem(key, value) { assert.equal(key, 'mars_exploration_path'); this.value = value; this.writes++ },
    removeItem() { this.value = null },
  }
}

test('standing at altitude and camera bob do not add points; horizontal movement must exceed five meters', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const store = storage(), path = createMarsExplorationPath(store)
  path.record({ x: 100, y: 500, z: 200 })
  for (let i = 0; i < 600; i++) path.record({ x: 100, y: 500 + Math.sin(i), z: 200 })
  path.record({ x: 103, y: 900, z: 204 })
  assert.deepEqual(path.points, [{ x: 100, z: 200 }])
  path.record({ x: 106, y: 500, z: 200 })
  assert.equal(path.points.length, 2)
  assert.equal(store.writes, 0)
  t.mock.timers.tick(2000)
  assert.deepEqual(JSON.parse(store.value), path.points)
  assert.equal(store.writes, 1)
  path.dispose()
})

test('long walks and duplicate-heavy legacy saves remain bounded and preserve recent route order', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const loaded = Array.from({ length: 3000 }, (_, i) => ({ x: i * 6, z: -i }))
  const store = storage(JSON.stringify([...loaded, ...Array(5000).fill(loaded.at(-1)), null, { x: 'bad', z: 0 }]))
  const path = createMarsExplorationPath(store)
  assert.equal(path.points.length, 2048)
  assert.deepEqual(path.points[0], loaded[952])
  assert.deepEqual(path.points.at(-1), loaded.at(-1))
  assert.equal(JSON.parse(store.value).length, 2048)
  for (let i = 3000; i < 6000; i++) path.record({ x: i * 6, y: 700, z: -i })
  path.dispose()
  assert.equal(path.points.length, 2048)
  assert.deepEqual(JSON.parse(store.value).at(-1), { x: 35994, z: -5999 })
  assert.ok(store.value.length < 100000)
})

test('quota failure warns once and retains live points; clearing allows saving again', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const warning = t.mock.method(console, 'warn', () => {})
  const store = storage(), path = createMarsExplorationPath(store)
  let attempts = 0
  const write = store.setItem
  store.setItem = () => { attempts++; throw new DOMException('Full', 'QuotaExceededError') }
  for (let i = 0; i < 5; i++) {
    path.record({ x: i * 6, y: 300, z: 0 })
    t.mock.timers.tick(2000)
  }
  path.dispose()
  assert.equal(attempts, 1)
  assert.equal(warning.mock.callCount(), 1)
  assert.equal(path.points.length, 5)
  store.setItem = write
  path.clear({ x: 24, z: 0 })
  path.record({ x: 30, y: 300, z: 0 })
  path.dispose()
  assert.deepEqual(JSON.parse(store.value), [{ x: 30, z: 0 }])
})

test('reset cancels pending writes and rebases sampling; disposal flushes only once', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const store = storage(), path = createMarsExplorationPath(store)
  path.record({ x: 0, y: 50, z: 0 })
  path.clear({ x: 100, z: 100 })
  t.mock.timers.tick(2000)
  assert.equal(store.value, null)
  path.record({ x: 100, y: 900, z: 100 })
  assert.equal(path.points.length, 0)
  path.record({ x: 106, y: 900, z: 100 })
  path.dispose()
  t.mock.timers.tick(2000)
  path.dispose()
  assert.equal(store.writes, 1)
  assert.deepEqual(JSON.parse(store.value), [{ x: 106, z: 100 }])
})
