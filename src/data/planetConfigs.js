// Planet Surface Configuration System
// Defines landable planets and their surface properties

/**
 * Configuration for planet surface environments
 * @typedef {Object} PlanetConfig
 * @property {boolean} landable - Whether the planet can be landed on
 * @property {string} skyColor - Hex color for sky gradient (top)
 * @property {string} skyColorHorizon - Hex color for sky gradient (horizon)
 * @property {string} groundColor - Hex color for ground material
 * @property {number} fogDensity - Fog density (0 = none, higher = thicker)
 * @property {string} fogColor - Hex color for atmospheric fog
 * @property {number} ambientLight - Ambient light intensity (0-1)
 * @property {string} atmosphereType - 'thick' | 'thin' | 'none'
 * @property {Object} movement - Movement parameters
 * @property {number} movement.walkSpeed - Base walking speed
 * @property {number} movement.gravity - Gravity feel (affects jump, not physics)
 */

export const planetConfigs = {
    // PHASE 1: Mars - The Red Planet
    mars: {
        landable: true,

        // Visual: Dusty red-orange Martian atmosphere
        skyColor: '#4d2617',           // Dark reddish-brown (zenith)
        skyColorHorizon: '#ff6633',    // Bright orange-red (horizon)
        groundColor: '#cc4422',        // Rusty red ground
        fogDensity: 0.0015,            // Thin atmosphere (less than Earth)
        fogColor: '#ff8855',           // Warm orange haze
        ambientLight: 0.3,             // Dimmer than Earth (farther from Sun)
        atmosphereType: 'thin',        // Thin Martian atmosphere

        // Movement: Lower gravity feel
        movement: {
            walkSpeed: 25,               // Units per second
            gravity: 0.38,               // Mars gravity (fraction of Earth)
        },

        // Future expansion
        description: 'The Red Planet - explore ancient valleys and towering volcanoes',
        pointsOfInterest: []           // Future: Olympus Mons, Valles Marineris, etc.
    },

    // PHASE 2+: Other landable bodies (placeholders for now)
    moon: {
        landable: false,  // Will enable in Phase 2
        skyColor: '#000000',
        skyColorHorizon: '#0a0a0a',
        groundColor: '#888888',
        fogDensity: 0,                 // No atmosphere
        fogColor: '#000000',
        ambientLight: 0.1,
        atmosphereType: 'none',
        movement: {
            walkSpeed: 20,
            gravity: 0.16,               // Moon gravity
        }
    },

    mercury: {
        landable: false,
        skyColor: '#000000',
        skyColorHorizon: '#1a1a1a',
        groundColor: '#5a5a5a',
        fogDensity: 0,
        fogColor: '#000000',
        ambientLight: 0.5,             // Very bright (close to Sun)
        atmosphereType: 'none',
        movement: {
            walkSpeed: 22,
            gravity: 0.38,
        }
    },

    venus: {
        landable: false,
        skyColor: '#ffcc66',
        skyColorHorizon: '#ffaa44',
        groundColor: '#cc9944',
        fogDensity: 0.005,             // Thick atmosphere
        fogColor: '#ffcc88',
        ambientLight: 0.2,             // Dense clouds block light
        atmosphereType: 'thick',
        movement: {
            walkSpeed: 18,
            gravity: 0.91,
        }
    },

    earth: {
        landable: false,  // Users are already on Earth ;)
        skyColor: '#87ceeb',
        skyColorHorizon: '#ffd89b',
        groundColor: '#8b7355',
        fogDensity: 0.001,
        fogColor: '#c8ddf0',
        ambientLight: 0.4,
        atmosphereType: 'thick',
        movement: {
            walkSpeed: 20,
            gravity: 1.0,
        }
    },

    // Gas giants - not landable (no solid surface)
    jupiter: {
        landable: false,
        description: 'Gas giant - no solid surface to land on'
    },

    saturn: {
        landable: false,
        description: 'Gas giant - no solid surface to land on'
    },

    uranus: {
        landable: false,
        description: 'Ice giant - no solid surface to land on'
    },

    neptune: {
        landable: false,
        description: 'Ice giant - no solid surface to land on'
    },

    sun: {
        landable: false,
        description: 'The Sun - far too hot to land on!'
    }
}

/**
 * Get configuration for a specific planet
 * @param {string} planetId - Planet identifier
 * @returns {PlanetConfig|null} Planet configuration or null if not found
 */
export function getPlanetConfig(planetId) {
    return planetConfigs[planetId] || null
}

/**
 * Check if a planet is landable
 * @param {string} planetId - Planet identifier
 * @returns {boolean} True if planet can be landed on
 */
export function isLandable(planetId) {
    const config = getPlanetConfig(planetId)
    return config ? config.landable === true : false
}

/**
 * Get all landable planet IDs
 * @returns {string[]} Array of landable planet IDs
 */
export function getLandablePlanets() {
    return Object.keys(planetConfigs).filter(id => isLandable(id))
}
