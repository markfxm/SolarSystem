import { AstrologyService } from './AstrologyService.js'
import { computeD, computeElements, computePosition } from './Astronomy.js'

const OCCASION_FALLBACKS = {
  birthday: 'Birthday',
  couple: 'Love Story',
  baby: 'New Arrival',
  anniversary: 'Anniversary',
  custom: 'Stellar Moment'
}

const ELEMENT_FALLBACKS = {
  fire: 'Fire',
  earth: 'Earth',
  air: 'Air',
  water: 'Water',
  none: 'Balanced'
}

const SNAPSHOT_BODY_IDS = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
const SNAPSHOT_ORBIT_BASE_RADIUS = 220
const SNAPSHOT_ORBIT_STEP = 140
const SNAPSHOT_OUTER_ORBIT_RADIUS = SNAPSHOT_ORBIT_BASE_RADIUS + 7 * SNAPSHOT_ORBIT_STEP
const SNAPSHOT_MOON_ORBIT_RADIUS = 80
const SNAPSHOT_BODY_INDEX = {
  mercury: 0,
  venus: 1,
  earth: 2,
  mars: 3,
  jupiter: 4,
  saturn: 5,
  uranus: 6,
  neptune: 7
}

export const OCCASION_TYPES = Object.keys(OCCASION_FALLBACKS)

function resolveText(t, path, fallback) {
  if (typeof t !== 'function') return fallback
  const value = t(path)
  return value && value !== path ? value : fallback
}

function resolveSignName(t, signIndex, signId) {
  const names = typeof t === 'function' ? t('zodiac_names') : null
  if (Array.isArray(names) && names[signIndex]) return names[signIndex]
  return signId || ''
}

function resolvePlanetName(t, planetId) {
  return resolveText(t, `planet.${planetId}`, planetId)
}

function resolveAspectName(t, aspect) {
  if (!aspect?.label) return ''
  const label = resolveText(t, aspect.label, aspect.type || '')
  return label.replace(/[^\p{L}\p{N}\s-]/gu, '').trim() || aspect.type || ''
}

function buildSnapshotBodies(date) {
  const d = computeD(date)
  const bodies = {
    sun: { x: 0, y: 0 }
  }

  for (const id of SNAPSHOT_BODY_IDS) {
    if (id === 'sun') continue
    const elements = computeElements(id, d, null, 1)
    const pos = computePosition(elements)
    const index = SNAPSHOT_BODY_INDEX[id]
    const radius = (SNAPSHOT_ORBIT_BASE_RADIUS + index * SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS
    const len = Math.hypot(pos.x, pos.y) || 1
    bodies[id] = { x: (pos.x / len) * radius, y: (pos.y / len) * radius }
  }

  const earthElements = computeElements('earth', d, null, 1)
  const earthPos = computePosition(earthElements)
  const earthLen = Math.hypot(earthPos.x, earthPos.y) || 1
  const earthRadius = (SNAPSHOT_ORBIT_BASE_RADIUS + SNAPSHOT_BODY_INDEX.earth * SNAPSHOT_ORBIT_STEP) / SNAPSHOT_OUTER_ORBIT_RADIUS
  bodies.earth = { x: (earthPos.x / earthLen) * earthRadius, y: (earthPos.y / earthLen) * earthRadius }

  const moonElements = computeElements('moon', d, null, 1)
  const moonPos = computePosition(moonElements)
  const moonLen = Math.hypot(moonPos.x, moonPos.y) || 1
  const moonRadius = SNAPSHOT_MOON_ORBIT_RADIUS / SNAPSHOT_OUTER_ORBIT_RADIUS
  bodies.moon = {
    x: bodies.earth.x + (moonPos.x / moonLen) * moonRadius,
    y: bodies.earth.y + (moonPos.y / moonLen) * moonRadius
  }

  return bodies
}

export function buildStellarPosterMeta({
  date,
  title,
  occasionType = 'custom',
  t
}) {
  const chart = AstrologyService.calculateGeocentricChart(date)
  const aspects = AstrologyService.calculateAspects(chart).map(item => ({
    p1: item.p1,
    p2: item.p2,
    aspect: { ...item.aspect }
  }))
  const majorAspect = AstrologyService.getMajorAspect(aspects)
  const elementResult = AstrologyService.calculateElementBalance(chart)
  const dominantElement = elementResult.dominant || 'none'
  const safeOccasion = OCCASION_FALLBACKS[occasionType] ? occasionType : 'custom'

  const sunSign = resolveSignName(t, chart.sun?.index, chart.sun?.signId)
  const moonSign = resolveSignName(t, chart.moon?.index, chart.moon?.signId)
  const occasionLabel = resolveText(t, `stellar.occasion_${safeOccasion}`, OCCASION_FALLBACKS[safeOccasion])
  const elementLabel = resolveText(t, `stellar.element_${dominantElement}`, ELEMENT_FALLBACKS[dominantElement] || dominantElement)
  const dominantSuffix = resolveText(t, 'stellar.dominantSuffix', 'Dominant')
  const shortMessage = resolveText(t, `stellar.message_${safeOccasion}`, 'A personal map of the sky for this moment.')

  let aspectSummary = resolveText(t, 'stellar.no_major_aspect', 'No major aspect')
  if (majorAspect) {
    aspectSummary = [
      resolvePlanetName(t, majorAspect.p1),
      resolveAspectName(t, majorAspect.aspect).toLowerCase(),
      resolvePlanetName(t, majorAspect.p2)
    ].filter(Boolean).join(' ')
  }

  return {
    title: (title || '').trim() || resolveText(t, 'stellar.defaultPosterTitle', 'My Stellar Moment'),
    occasionType: safeOccasion,
    occasionLabel,
    date,
    chart,
    snapshotBodies: buildSnapshotBodies(date),
    aspects,
    sunSign,
    moonSign,
    dominantElement,
    dominantElementLabel: elementLabel,
    majorAspect,
    aspectSummary,
    shortMessage,
    summaryLine: `${resolvePlanetName(t, 'sun')} in ${sunSign} | ${resolvePlanetName(t, 'moon')} in ${moonSign} | ${elementLabel} ${dominantSuffix}`
  }
}
