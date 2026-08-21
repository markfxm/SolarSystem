import { computeD, computeElements, computePosition, RAD2DEG, PLANETS_DATA } from './Astronomy.js';

export const ZODIAC_SIGNS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

export const ASPECT_TYPES = {
    CONJUNCTION: { angle: 0, orb: 8, color: 0xffffff, label: 'aspect.conjunction' },
    OPPOSITION: { angle: 180, orb: 8, color: 0xff3333, label: 'aspect.opposition' },
    TRINE: { angle: 120, orb: 8, color: 0x33ff88, label: 'aspect.trine' },
    SQUARE: { angle: 90, orb: 7, color: 0x00aaff, label: 'aspect.square' },
    SEXTILE: { angle: 60, orb: 6, color: 0xffcc33, label: 'aspect.sextile' }
};

export const ASPECT_TYPE_TO_ID = {
    CONJUNCTION: 0,
    OPPOSITION: 1,
    TRINE: 2,
    SQUARE: 3,
    SEXTILE: 4
};

const ASPECT_PRIORITY = {
    'CONJUNCTION': 1,
    'OPPOSITION': 2,
    'SQUARE': 3,
    'TRINE': 4,
    'SEXTILE': 5
};

// Add pre-formatted color strings, lowercase type, and numeric priorities for O(1) hot loop access
const ASPECT_DATA = [];
for (const key in ASPECT_TYPES) {
    const aspect = ASPECT_TYPES[key];
    aspect.type = key;
    aspect.typeLower = key.toLowerCase();
    aspect.priority = ASPECT_PRIORITY[key] ?? 99;
    aspect.colorStr = '#' + aspect.color.toString(16).padStart(6, '0');
    ASPECT_DATA.push(aspect);
}
const HELIOCENTRIC_PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const GEOCENTRIC_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const GEOCENTRIC_PLANET_SET = new Set(GEOCENTRIC_PLANETS);

const HELIOCENTRIC_ENTRIES = HELIOCENTRIC_PLANETS.map(name => ({
    name,
    data: PLANETS_DATA[name]
}));

const GEOCENTRIC_ENTRIES = GEOCENTRIC_PLANETS.map(name => ({
    name,
    data: PLANETS_DATA[name]
}));

const earthData = PLANETS_DATA.earth;
const ALL_BODIES = ['sun', 'moon', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Pre-calculate minutes padding for formatDegree (00-59)
const MINUTES_CACHE = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
// Pre-calculate and cache all 21,600 possible formatted degree strings (360 degrees * 60 minutes)
// to eliminate string allocations and concatenations in the hot path.
const DEGREE_FULL_CACHE = Array.from({ length: 360 }, (_, d) => {
    const dStr = d + '°';
    return Array.from({ length: 60 }, (_, m) => dStr + MINUTES_CACHE[m] + "'");
});

export const BODY_TO_ID = {
    sun: 0,
    moon: 1,
    mercury: 2,
    venus: 3,
    earth: 4,
    mars: 5,
    jupiter: 6,
    saturn: 7,
    uranus: 8,
    neptune: 9
};

export function createAspectDirtyChecker(initialCapacity = 64) {
    let lastKeys = new Int32Array(initialCapacity);
    let lastCount = -1;

    return {
        hasChanged(aspects) {
            let changed = aspects.length !== lastCount;

            if (aspects.length > lastKeys.length) {
                lastKeys = new Int32Array(Math.max(aspects.length * 2, 1));
                changed = true;
            }

            for (let i = 0; i < aspects.length; i++) {
                const item = aspects[i];
                const p1Id = BODY_TO_ID[item.p1] ?? 0;
                const p2Id = BODY_TO_ID[item.p2] ?? 0;
                const typeId = ASPECT_TYPE_TO_ID[item.aspect.type] ?? 0;
                const orbMin = Math.round(item.aspect.orb * 60);
                const key = (p1Id << 20) | (p2Id << 16) | (typeId << 12) | orbMin;

                if (lastKeys[i] !== key) {
                    lastKeys[i] = key;
                    changed = true;
                }
            }

            if (changed) lastCount = aspects.length;
            return changed;
        }
    };
}

// Optimization: Pre-link celestial body entries with pre-resolved numeric IDs to avoid BODY_TO_ID lookups inside loops
const ALL_BODY_ENTRIES = ALL_BODIES.map(name => ({
    name,
    id: BODY_TO_ID[name]
}));

export const ZODIAC_ELEMENTS = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water'
};

// Optimization: Pre-indexed element lookup to avoid string key lookups in 60fps loops
export const ELEMENTS = ['fire', 'earth', 'air', 'water'];
export const ELEMENT_BY_INDEX = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water'];

const CALIBRATION_OFFSET = 1.7;

// Scratch variables to avoid per-frame GC and fix re-entrancy bugs
const _earthElements = {
    a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1, aSqrtEE: 1,
    Px: 1, Qx: 0, Py: 0, Qy: 1, Pz: 0, Qz: 0,
    PxA: 1, PyA: 0, PzA: 0, QxAS: 0, QyAS: 1, QzAS: 0
};

// Performance Optimization: Per-planet scratch objects for geocentric astrology loop.
// This enables the "warm-start" Kepler solver optimization in Astronomy.js,
// reducing typical NR iterations from 3-4 down to 1 per planet.
const _geoScratch = ALL_BODIES.reduce((acc, name) => {
    acc[name] = {
        a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1, aSqrtEE: 1,
        Px: 1, Qx: 0, Py: 0, Qy: 1, Pz: 0, Qz: 0,
        PxA: 1, PyA: 0, PzA: 0, QxAS: 0, QyAS: 1, QzAS: 0,
        lastD: -999999, lastPlanet: null, lastE: 0, lastM: 0, lastScale: -1
    };
    return acc;
}, {});

const _earthPos = { x: 0, y: 0, z: 0, r: 0 };
const _pElements = {
    a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1, aSqrtEE: 1,
    Px: 1, Qx: 0, Py: 0, Qy: 1, Pz: 0, Qz: 0,
    PxA: 1, PyA: 0, PzA: 0, QxAS: 0, QyAS: 1, QzAS: 0
};
const _pPos = { x: 0, y: 0, z: 0, r: 0 };

// Scratch variables for calculateAspects
const _longitudes = new Float32Array(16);

export class AstrologyService {
    static getSignAndDegree(longitude, target = {}) {
        let normalized = (longitude + CALIBRATION_OFFSET) % 360;
        if (normalized < 0) normalized += 360;

        const signIndex = Math.floor(normalized / 30);
        // Performance Optimization: Replace floating-point modulo operator (normalized % 30)
        // with exact subtraction (normalized - signIndex * 30) to eliminate modulo arithmetic in hot loop.
        const degreeWithinSign = normalized - signIndex * 30;

        target.index = signIndex;
        // Optimization: Pre-calculate elementIndex (0: fire, 1: earth, 2: air, 3: water) in O(1) time
        target.elementIndex = signIndex & 3;
        target.signId = ZODIAC_SIGNS[signIndex];
        target.degree = degreeWithinSign;
        // Optimization: Store calibrated longitude to avoid re-calculation in calculateAspects
        target.longitude = normalized;
        return target;
    }

    static calculateHeliocentricChart(d, target = null) {
        const results = target || {};
        const days = computeD(d);

        for (let i = 0; i < HELIOCENTRIC_ENTRIES.length; i++) {
            const entry = HELIOCENTRIC_ENTRIES[i];
            const name = entry.name;
            // Performance Optimization: Use per-planet scratch to enable warm-start NR solver
            // Passing entry.data directly eliminates string lookup and parsing in computeElements.
            const elements = computeElements(entry.data, days, _geoScratch[name], 1);
            const pos = computePosition(elements, _pPos);
            // Math Fix: In world space, x_ecl = x, y_ecl = -z.
            // Previous code used world-y (ecliptic-z) which is wrong for longitude.
            const longitudeRad = Math.atan2(-pos.z, pos.x);
            let longitudeDeg = longitudeRad * RAD2DEG;
            results[name] = this.getSignAndDegree(longitudeDeg, results[name]);
        }

        return results;
    }

    /**
     * Calculates planetary longitudes relative to Earth.
     * Performance Optimization: Can accept planetObjects (scene meshes) to reuse
     * already-calculated positions, skipping expensive Keplerian math.
     */
    static calculateGeocentricChart(d, planetObjects = null, target = null) {
        const results = target || {};
        const days = computeD(d);

        let earthX = 0, earthYecl = 0;

        if (planetObjects && planetObjects.earth) {
            // Optimization: Reuse scene positions. In our coordinate system,
            // x_ecliptic = world.x, y_ecliptic = -world.z
            const earth = planetObjects.earth;
            earthX = earth.position.x;
            earthYecl = -earth.position.z;
        } else {
            const earthElements = computeElements(earthData, days, _earthElements, 1);
            const earthPos = computePosition(earthElements, _earthPos);
            earthX = earthPos.x;
            earthYecl = -earthPos.z; // x_ecl = x, y_ecl = -z
        }

        for (let i = 0; i < GEOCENTRIC_ENTRIES.length; i++) {
            const entry = GEOCENTRIC_ENTRIES[i];
            const name = entry.name;
            const data = entry.data;
            let relX, relY;

            if (name === 'sun') {
                relX = -earthX;
                relY = -earthYecl;
            } else if (name === 'moon' && planetObjects && planetObjects.moon && planetObjects.earth) {
                // Moon is already geocentric in our scene relative to Earth's mesh
                // so we use its local position relative to Earth
                const moon = planetObjects.moon;
                const earth = planetObjects.earth;
                relX = moon.position.x - earth.position.x;
                relY = -(moon.position.z - earth.position.z);
            } else if (name === 'moon') {
                const elements = computeElements(data, days, _geoScratch.moon, 1);
                const pPos = computePosition(elements, _pPos);
                relX = pPos.x;
                relY = -pPos.z; // world x=x_ecl, world z=-y_ecl
            } else if (planetObjects && planetObjects[name]) {
                const p = planetObjects[name];
                relX = p.position.x - earthX;
                relY = -p.position.z - earthYecl;
            } else {
                const elements = computeElements(data, days, _geoScratch[name], 1);
                const pPos = computePosition(elements, _pPos);
                relX = pPos.x - earthX;
                relY = -pPos.z - earthYecl;
            }

            const longitudeRad = Math.atan2(relY, relX);
            const longitudeDeg = longitudeRad * RAD2DEG;

            results[name] = this.getSignAndDegree(longitudeDeg, results[name]);
        }

        return results;
    }

    static formatDegree(degree) {
        // Performance Optimization: Use a 2D pre-calculated cache for O(1) string retrieval.
        // This eliminates approximately 21,600 temporary string allocations and concatenations
        // per minute during high-frequency simulation updates.
        let d = Math.floor(degree);
        let m = Math.round((degree - d) * 60);

        // Normalize minute overflow from floating point math
        if (m >= 60) { d++; m = 0; }
        if (m < 0) m = 0;

        // Wrap degrees to [0, 359] range
        d = (d % 360 + 360) % 360;

        return DEGREE_FULL_CACHE[d][m];
    }

    /**
     * Finds if there is an aspect between two longitudes.
     * Optimized: Returns a result from a scratch object pool to avoid allocations.
     */
    static findAspect(long1, long2, target = null) {
        let diff = Math.abs(long1 - long2);
        if (diff > 180) diff = 360 - diff;

        // Use pre-cached flattened data to avoid entry indexing and key lookups
        for (let i = 0; i < ASPECT_DATA.length; i++) {
            const data = ASPECT_DATA[i];
            const orb = Math.abs(diff - data.angle);
            if (orb <= data.orb) {
                // Reuse target object if provided to avoid per-aspect allocations
                const res = target || {};
                res.type = data.type;
                res.typeLower = data.typeLower;
                res.orb = orb;
                res.angle = data.angle;
                res.color = data.color;
                res.label = data.label;
                res.colorStr = data.colorStr;
                res.priority = data.priority;
                return res;
            }
        }
        return null;
    }

    // Scratch pool for aspect results to avoid massive object churn in the loop
    static _aspectPool = Array.from({ length: 100 }, () => ({}));
    static _aspectPoolIdx = 0;

    // Additional pool for aspect WRAPPERS {p1, p2, aspect}
    static _wrapperPool = Array.from({ length: 100 }, () => ({ p1: '', p2: '', aspect: null }));
    static _wrapperPoolIdx = 0;
    static _aspectsResult = [];

    static calculateAspects(chart) {
        const aspects = this._aspectsResult;
        aspects.length = 0;
        this._aspectPoolIdx = 0;
        this._wrapperPoolIdx = 0;
        const entries = ALL_BODY_ENTRIES;

        // Pre-calculate longitudes to avoid redundant math and object lookups in inner loop
        _longitudes.fill(-1);
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const c = chart[entry.name];
            if (c) {
                // Performance Optimization: Use pre-calculated calibrated longitude and pre-resolved numeric id
                _longitudes[entry.id] = c.longitude;
            }
        }

        for (let i = 0; i < entries.length; i++) {
            const e1 = entries[i];
            const id1 = e1.id;
            const long1 = _longitudes[id1];
            if (long1 === -1) continue;

            for (let j = i + 1; j < entries.length; j++) {
                const e2 = entries[j];
                const id2 = e2.id;
                const long2 = _longitudes[id2];
                if (long2 === -1) continue;

                const aspect = this.findAspect(long1, long2, this._aspectPool[this._aspectPoolIdx]);
                if (aspect) {
                    const wrapper = this._wrapperPool[this._wrapperPoolIdx];
                    wrapper.p1 = e1.name;
                    wrapper.p2 = e2.name;
                    wrapper.aspect = aspect;
                    aspects.push(wrapper);

                    this._aspectPoolIdx = (this._aspectPoolIdx + 1) % this._aspectPool.length;
                    this._wrapperPoolIdx = (this._wrapperPoolIdx + 1) % this._wrapperPool.length;
                }
            }
        }
        return aspects;
    }

    static getMajorAspect(aspects) {
        if (!aspects || aspects.length === 0) return null;

        let major = null;

        for (let i = 0; i < aspects.length; i++) {
            const item = aspects[i];
            if (!major) {
                major = item;
            } else {
                const orbDiff = item.aspect.orb - major.aspect.orb;
                // Favor smaller orbs, then priority
                if (orbDiff < -1.0) {
                    major = item;
                } else if (Math.abs(orbDiff) <= 1.0) {
                    if (item.aspect.priority < major.aspect.priority) {
                        major = item;
                    }
                }
            }
        }

        return major;
    }

    static getCosmicGuidance(chart, majorAspect) {
        if (!chart || !chart.sun || !chart.moon) return null;

        const sunSign = chart.sun.signId;
        const moonSign = chart.moon.signId;

        let strategyKey = null;
        let p1 = null;
        let p2 = null;

        if (majorAspect) {
            strategyKey = majorAspect.aspect.typeLower || majorAspect.aspect.type.toLowerCase();
            p1 = majorAspect.p1;
            p2 = majorAspect.p2;
        }

        return {
            sunKey: sunSign,
            moonKey: moonSign,
            strategyKey: strategyKey,
            p1: p1,
            p2: p2
        };
    }

    /**
     * Calculates the balance of elements based on the chart.
     * Optimized: Updates targetBalance in-place and returns a result object.
     * Performance: Uses O(1) numeric lookups and standard for loops to minimize GC/CPU overhead.
     */
    static calculateElementBalance(chart, targetBalance = null, targetResult = null) {
        const balance = targetBalance || { fire: 0, earth: 0, air: 0, water: 0 };
        const result = targetResult || { balance, dominant: 'none' };

        balance.fire = 0;
        balance.earth = 0;
        balance.air = 0;
        balance.water = 0;

        for (let i = 0; i < GEOCENTRIC_PLANETS.length; i++) {
            const name = GEOCENTRIC_PLANETS[i];
            const info = chart[name];
            if (info) {
                // Optimization: Use pre-calculated element index for O(1) direct lookup
                const element = ELEMENTS[info.elementIndex ?? (info.index & 3)];
                if (element) balance[element]++;
            }
        }

        let maxVal = -1;
        let dominant = 'none';
        // Optimization: Use standard for loop over elements array to avoid for...in overhead
        for (let i = 0; i < ELEMENTS.length; i++) {
            const el = ELEMENTS[i];
            const count = balance[el];
            if (count > maxVal) {
                maxVal = count;
                dominant = el;
            }
        }

        result.balance = balance;
        result.dominant = dominant;
        return result;
    }

    static getArchetype(sunSignId, dominantElement) {
        if (!sunSignId || !dominantElement || dominantElement === 'none') {
            return null;
        }
        const naturalElement = ZODIAC_ELEMENTS[sunSignId];
        return `${sunSignId}_${naturalElement}`;
    }
}
