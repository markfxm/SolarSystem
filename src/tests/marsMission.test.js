import test from 'node:test'
import assert from 'node:assert/strict'
import { createMarsMission, createMarsMissionDefinitions } from '../planets/Mars/MarsMission.js'
const signals = [
  { id: 'signal01', position: { x: 26, z: -112 } },
  { id: 'signal02', position: { x: -65, z: -155 } },
]
const base = { x: -12, z: -17 }
const definitions = () => createMarsMissionDefinitions(signals, base)

test('both missions share reach, timed scan and explicit upload; the next target unlocks only after delivery', () => {
  const defs = definitions(), mission = createMarsMission(defs)
  for (const [index, definition] of defs.entries()) {
    const target = definition.targets[0], player = target.position
    assert.equal(mission.state.missionId, definition.id)
    assert.equal(mission.state.activeTarget, target)
    assert.equal(mission.state.discovered, false)
    assert.equal(mission.state.completedCount, index)
    assert.deepEqual(mission.state.unlockedTargetIds, defs.slice(0, index + 1).map(d => d.targets[0].id))
    mission.update(0, base, true)
    assert.equal(mission.interact(base), false)
    mission.update(0, player, true)
    assert.equal(mission.state.stage, 'ready')
    assert.equal(mission.interact(player), true)
    assert.equal(mission.interact(player), false)
    mission.update(1.5, player, true)
    assert.equal(mission.state.progress, 0.5)
    mission.update(10, player, false)
    assert.equal(mission.state.progress, 0.5)
    mission.update(1.5, player, true)
    assert.equal(mission.state.stage, 'return')
    assert.equal(mission.state.discovered, true)
    assert.equal(mission.state.activeTarget, definition.targets[1])
    assert.equal(mission.interact(player), false)
    mission.update(0, base, true)
    assert.equal(mission.state.stage, 'upload')
    assert.equal(mission.state.completedCount, index)
    mission.update(0, player, true)
    assert.equal(mission.state.stage, 'return')
    assert.equal(mission.interact(player), false)
    mission.update(0, base, true)
    mission.update(0, base, false)
    assert.equal(mission.interact(base), false)
    mission.update(0, base, true)
    assert.equal(mission.interact(base), true)
    assert.equal(mission.interact(base), false)
    assert.equal(mission.state.completedCount, index + 1)
  }
  assert.equal(mission.state.stage, 'complete')
  assert.equal(mission.state.activeTarget, null)
  assert.deepEqual(mission.state.completedMissionIds, defs.map(d => d.id))
  mission.update(100, signals[0].position, true)
  assert.equal(mission.interact(signals[0].position), false)
})

test('configured radius is checked again on E; leaving range resets scanning and retry starts fresh', () => {
  for (const definition of definitions()) {
    const mission = createMarsMission([definition]), target = definition.targets[0]
    const boundary = { x: target.position.x + target.radius, z: target.position.z }
    const outside = { ...boundary, x: boundary.x + 0.01 }
    mission.update(0, boundary, true)
    assert.equal(mission.state.stage, 'ready')
    assert.equal(mission.interact(outside), false)
    assert.equal(mission.interact(boundary), true)
    mission.update(1, boundary, true)
    mission.update(0, outside, true)
    assert.equal(mission.state.stage, 'approach')
    assert.equal(mission.state.progress, 0)
    mission.update(0, target.position, true)
    mission.interact(target.position)
    mission.update(target.duration, target.position, true)
    assert.equal(mission.state.stage, 'return')
  }
})

test('a third mission works by configuration, including duration, prompt and exactly-once callbacks', () => {
  const definition = definitions()[0]
  let scanned = 0, uploaded = 0
  const third = {
    ...definition, id: 'custom-survey', number: '03', label: 'custom-signal',
    targets: definition.targets.map((target, index) => ({
      ...target, id: `custom-${index}`, position: index ? base : { x: 200, z: 300 },
      radius: 2, duration: 0.5, prompt: 'custom-prompt',
      onComplete(context) { index ? uploaded++ : scanned++; target.onComplete(context) },
    })),
  }
  const mission = createMarsMission([third])
  mission.update(0, third.targets[0].position, true)
  assert.equal(mission.state.activeTarget.prompt, 'custom-prompt')
  mission.interact(third.targets[0].position)
  mission.update(0.5, third.targets[0].position, true)
  mission.update(1, third.targets[0].position, true)
  assert.equal(scanned, 1)
  mission.update(0, base, true)
  mission.interact(base); mission.interact(base)
  assert.equal(uploaded, 1)
  const fresh = createMarsMission(definitions())
  assert.equal(fresh.state.completedCount, 0)
  assert.equal(fresh.state.discovered, false)
  assert.deepEqual(fresh.state.unlockedTargetIds, ['signal01'])
})
