import * as THREE from 'three'

export const LOW_RES_PLANET_MAPS = Object.freeze({
  sun: '/sun.jpg',
  mercury: '/mercury.jpg',
  venus: '/venus.jpg',
  earth_day: '/2k_earth_daymap.jpg',
  earth_night: '/2k_earth_nightmap.jpg',
  mars: '/mars.jpg',
  jupiter: '/jupiter.jpg',
  saturn: '/saturn.jpg',
  uranus: '/uranus.jpg',
  neptune: '/neptune.jpg',
  moon: '/moon.jpg'
})

export const HIGH_RES_PLANET_MAPS = Object.freeze({
  sun: '/hq/8k_sun.jpg',
  mercury: '/hq/8k_mercury.jpg',
  venus: '/hq/8k_venus.jpg',
  earth_day: '/hq/8k_earth_daymap.jpg',
  earth_night: '/hq/8k_earth_nightmap.jpg',
  mars: '/hq/8k_mars.jpg',
  jupiter: '/hq/8k_jupiter.jpg',
  saturn: '/hq/8k_saturn.jpg',
  uranus: '/hq/2k_uranus.jpg',
  neptune: '/hq/2k_neptune.jpg',
  moon: '/hq/8k_moon.jpg'
})

function getTextureAnisotropy(renderer) {
  return Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1)
}

export function configureColorTexture(texture, renderer) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = getTextureAnisotropy(renderer)
  return texture
}

export function configureDataTexture(texture, renderer) {
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = getTextureAnisotropy(renderer)
  return texture
}
