import test from 'node:test'
import assert from 'node:assert/strict'
import { createMarsControls } from '../planets/Mars/MarsControls.js'
import { createMarsMission, createMarsMissionDefinitions } from '../planets/Mars/MarsMission.js'

function setup() {
  const doc = new EventTarget(), win = new EventTarget(), modes = []
  doc.hidden = false
  doc.hasFocus = () => true
  let requests = 0
  const element = { requestPointerLock() { requests++ } }
  doc.exitPointerLock = () => { doc.pointerLockElement = null }
  const controls = createMarsControls(element, mode => modes.push(mode), doc, win)
  const change = () => doc.dispatchEvent(new Event('pointerlockchange'))
  const lock = () => { controls.requestExplore(); doc.pointerLockElement = element; change() }
  return { doc, win, element, controls, modes, change, lock, requests: () => requests }
}

test('entry stays UI until lock succeeds; intentional unlock stays UI; close resumes only after success', () => {
  const f = setup()
  assert.equal(f.controls.mode, 'ui')
  assert.equal(f.requests(), 0)
  f.controls.requestExplore()
  assert.equal(f.controls.mode, 'ui')
  f.lock()
  assert.equal(f.controls.mode, 'explore')
  f.controls.enterUi(); f.change()
  assert.equal(f.controls.mode, 'ui')
  f.controls.requestExplore()
  f.doc.dispatchEvent(new Event('pointerlockerror'))
  assert.equal(f.controls.mode, 'ui')
  f.lock()
  assert.equal(f.controls.mode, 'explore')
  f.controls.pause(); f.change()
  assert.equal(f.controls.mode, 'paused')
  f.lock()
  assert.equal(f.controls.mode, 'explore')
  f.controls.dispose()
})

test('unexpected unlock, blur and hidden tab pause; focus restoration does not resume', () => {
  for (const cause of ['unlock', 'blur', 'hidden']) {
    const f = setup(); f.lock()
    if (cause === 'unlock') { f.doc.pointerLockElement = null; f.change() }
    if (cause === 'blur') f.win.dispatchEvent(new Event('blur'))
    if (cause === 'hidden') { f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange')) }
    assert.equal(f.controls.mode, 'paused')
    assert.equal(f.doc.pointerLockElement, null)
    f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange'))
    assert.equal(f.controls.mode, 'paused')
    f.controls.dispose()
  }
})

test('focus loss overrides UI intent and cancels a pending acquisition', () => {
  const f = setup(); f.lock(); f.controls.enterUi()
  f.win.dispatchEvent(new Event('blur')); f.change()
  assert.equal(f.controls.mode, 'paused')
  f.controls.requestExplore(); f.controls.pause()
  f.doc.pointerLockElement = f.element; f.change()
  assert.equal(f.controls.mode, 'paused')
  assert.equal(f.doc.pointerLockElement, null)
  f.controls.dispose()
})

test('opening UI while paused preserves pause until explicit resume succeeds', () => {
  const f = setup(); f.lock(); f.controls.pause()
  f.controls.enterUi(); f.change()
  assert.equal(f.controls.mode, 'paused')
  assert.equal(f.doc.pointerLockElement, null)
  f.controls.requestExplore()
  assert.equal(f.controls.mode, 'paused')
  f.doc.pointerLockElement = f.element; f.change()
  assert.equal(f.controls.mode, 'explore')
  f.controls.dispose()
})

test('rejected and synchronous lock failures keep the previous mode and allow retry', async () => {
  const f = setup()
  f.element.requestPointerLock = () => { throw new Error('denied') }
  f.controls.requestExplore()
  assert.equal(f.controls.mode, 'ui')
  f.element.requestPointerLock = () => Promise.reject(new Error('denied'))
  f.controls.requestExplore()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.controls.mode, 'ui')
  f.element.requestPointerLock = () => undefined
  f.lock()
  assert.equal(f.controls.mode, 'explore')
  f.controls.dispose()
})

test('disposing releases the lock, cancels pending requests and removes listeners', () => {
  const f = setup(); f.lock(); f.controls.dispose()
  assert.equal(f.doc.pointerLockElement, null)
  const count = f.modes.length
  f.win.dispatchEvent(new Event('blur')); f.change()
  f.doc.dispatchEvent(new Event('visibilitychange'))
  f.controls.requestExplore()
  assert.equal(f.modes.length, count)
  assert.equal(f.requests(), 1)
})

test('a request completing after disposal cannot leave a captured cursor', async () => {
  const f = setup()
  let resolve
  f.element.requestPointerLock = () => new Promise(done => { resolve = done })
  f.controls.requestExplore()
  f.controls.dispose()
  f.doc.pointerLockElement = f.element
  resolve()
  await new Promise(done => setImmediate(done))
  assert.equal(f.doc.pointerLockElement, null)
  assert.equal(f.controls.mode, 'paused')
})

test('scan advances in UI, freezes in paused and resumes preserved progress', () => {
  const f = setup()
  const position = { x: 0, z: 0 }
  const mission = createMarsMission(createMarsMissionDefinitions([
    { id: 'signal01', position }, { id: 'signal02', position: { x: 100, z: 100 } },
  ], { x: 50, z: 50 }))
  const tick = delta => mission.update(delta, position, f.controls.mode !== 'paused')
  f.lock(); tick(0); mission.interact(position); tick(1)
  f.controls.enterUi(); f.change(); tick(1)
  assert.equal(mission.state.progress, 2 / 3)
  assert.equal(mission.state.paused, false)
  f.controls.pause(); tick(10)
  assert.equal(mission.state.progress, 2 / 3)
  assert.equal(mission.state.paused, true)
  f.lock(); tick(1)
  assert.equal(mission.state.stage, 'return')
  f.controls.dispose()
})
