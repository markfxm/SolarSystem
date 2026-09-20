// Pointer Lock is an input device; only explicit pause/focus loss pauses the world.
export function createMarsControls(element, onChange, doc = document, win = window) {
  let mode = 'ui'
  let pending = false
  let disposed = false
  function setMode(next) {
    mode = next
    onChange(next)
  }
  function release() {
    if (doc.pointerLockElement === element) doc.exitPointerLock()
  }
  function pause() {
    pending = false
    setMode('paused')
    release()
  }
  function enterUi() {
    if (mode === 'paused' || disposed) return
    pending = false
    setMode('ui') // Record intent before the asynchronous unlock event.
    release()
  }
  function changed() {
    if (doc.pointerLockElement === element) {
      if (disposed || !pending || doc.hidden || !doc.hasFocus()) {
        release()
        return
      }
      pending = false
      setMode('explore')
    } else if (doc.hidden || !doc.hasFocus() || mode === 'explore') {
      // Browsers may consume Escape before dispatching keydown.
      pause()
    }
  }
  function failed() { pending = false }
  function requestExplore() {
    if (disposed || pending || mode === 'explore' || doc.hidden || !doc.hasFocus()) return
    pending = true
    try {
      element.requestPointerLock()?.then(() => {
        if (disposed || mode === 'paused' && !pending) release()
      }).catch(failed)
    } catch { failed() }
  }
  function visibilityChanged() { if (doc.hidden) pause() }
  doc.addEventListener('pointerlockchange', changed)
  doc.addEventListener('pointerlockerror', failed)
  doc.addEventListener('visibilitychange', visibilityChanged)
  win.addEventListener('blur', pause)
  return {
    get mode() { return mode },
    requestExplore, enterUi, pause,
    dispose() {
      disposed = true
      pause()
      doc.removeEventListener('pointerlockchange', changed)
      doc.removeEventListener('pointerlockerror', failed)
      doc.removeEventListener('visibilitychange', visibilityChanged)
      win.removeEventListener('blur', pause)
    },
  }
}
