export const SCAN_RANGE = 15
export const SCAN_SECONDS = 3
export const BASE_RANGE = 3

// Add future missions here; world anchors are supplied by the expedition scene.
export function createMarsMissionDefinitions(signals, base) {
  return [
    { id: 'survey-01', number: '01', signalId: 'signal01', label: 'mars.signal01', discovery: 'mars.discovery', radius: SCAN_RANGE, prompt: 'mars.scan_anomaly' },
    { id: 'survey-02', number: '02', signalId: 'signal02', label: 'mars.signal02', discovery: 'mars.discovery02', radius: 8, prompt: 'mars.scan_target' },
  ].map(definition => ({
    ...definition,
    targets: [
      {
        id: definition.signalId,
        position: signals.find(signal => signal.id === definition.signalId).position,
        radius: definition.radius,
        type: 'scan',
        prompt: definition.prompt,
        duration: SCAN_SECONDS,
        onComplete({ state, advanceTarget }) {
          state.discovered = true
          advanceTarget()
        },
      },
      {
        id: 'base', position: base, radius: BASE_RANGE, type: 'upload', prompt: 'mars.upload_data',
        onComplete({ completeMission }) { completeMission() },
      },
    ],
  }))
}

// One landing session. Both input and proximity read the same active target.
export function createMarsMission(definitions) {
  let missionIndex = 0, targetIndex = 0
  const state = {
    stage: 'approach', progress: 0, discovered: false, paused: true,
    completedCount: 0, completedMissionNumber: null, completedMissionIds: [], unlockedTargetIds: [],
    activeTarget: null, scanTarget: null, number: '', signalLabel: '', discoveryKey: '',
  }
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
  function selectTarget() {
    state.activeTarget = definitions[missionIndex].targets[targetIndex]
    state.progress = 0
    state.stage = state.activeTarget.type === 'scan' ? 'approach' : 'return'
  }
  function activateMission() {
    const definition = definitions[missionIndex]
    targetIndex = 0
    state.missionId = definition.id
    state.number = definition.number
    state.signalLabel = definition.label
    state.discoveryKey = definition.discovery
    state.scanTarget = definition.targets.find(target => target.type === 'scan')
    state.unlockedTargetIds = [...state.unlockedTargetIds, state.scanTarget.id]
    state.discovered = false
    selectTarget()
  }
  function completeMission() {
    const definition = definitions[missionIndex]
    state.completedCount++
    state.completedMissionNumber = definition.number
    state.completedMissionIds = [...state.completedMissionIds, definition.id]
    if (missionIndex + 1 < definitions.length) {
      missionIndex++
      activateMission()
    } else {
      state.stage = 'complete'
      state.activeTarget = null
    }
  }
  function completeTarget() {
    state.activeTarget.onComplete({
      state,
      advanceTarget() { targetIndex++; selectTarget() },
      completeMission,
    })
  }
  activateMission()
  return {
    state,
    interact(player) {
      const target = state.activeTarget
      if (state.paused || !target || !['ready', 'upload'].includes(state.stage) || distance(player, target.position) > target.radius) return false
      if (target.type === 'scan') {
        state.stage = 'scanning'
        state.progress = 0
      } else {
        completeTarget()
      }
      return true
    },
    update(delta, player, active) {
      state.paused = !active
      const target = state.activeTarget
      if (!active || !target) return
      const near = distance(player, target.position) <= target.radius
      if (state.stage === 'scanning') {
        if (!near) {
          state.stage = 'approach'
          state.progress = 0
        } else {
          state.progress = Math.min(1, state.progress + delta / target.duration)
          if (state.progress >= 1) completeTarget()
        }
      } else {
        state.stage = target.type === 'scan' ? (near ? 'ready' : 'approach') : (near ? 'upload' : 'return')
      }
    },
  }
}
