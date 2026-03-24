import { computeD, computeElements, computePosition, RAD2DEG } from './Astronomy.js';

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

// Add pre-formatted color strings for UI performance
for (const key in ASPECT_TYPES) {
    const aspect = ASPECT_TYPES[key];
    aspect.colorStr = '#' + aspect.color.toString(16).padStart(6, '0');
}

// Pre-cache entries to avoid Object.entries() in high-frequency loops
const ASPECT_TYPE_LIST = Object.entries(ASPECT_TYPES);
const HELIOCENTRIC_PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const GEOCENTRIC_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const ALL_BODIES = ['sun', 'moon', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

export const ZODIAC_ELEMENTS = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water'
};

const ASPECT_PRIORITY = {
    'CONJUNCTION': 1,
    'OPPOSITION': 2,
    'SQUARE': 3,
    'TRINE': 4,
    'SEXTILE': 5
};

const CALIBRATION_OFFSET = 1.7;

// Scratch variables to avoid per-frame GC and fix re-entrancy bugs
const _earthElements = {
    a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1,
    sinW: 0, cosW: 1, sinN: 0, cosN: 1, sinI: 0, cosI: 1
};
const _earthPos = { x: 0, y: 0, z: 0, r: 0 };
const _pElements = {
    a: 1, e: 0, i: 0, N: 0, w: 0, M: 0, sqrtEE: 1,
    sinW: 0, cosW: 1, sinN: 0, cosN: 1, sinI: 0, cosI: 1
};
const _pPos = { x: 0, y: 0, z: 0, r: 0 };

export class AstrologyService {
    static getSignAndDegree(longitude, target = {}) {
        let normalized = (longitude + CALIBRATION_OFFSET) % 360;
        if (normalized < 0) normalized += 360;

        const signIndex = Math.floor(normalized / 30);
        const degreeWithinSign = normalized % 30;

        target.index = signIndex;
        target.signId = ZODIAC_SIGNS[signIndex];
        target.degree = degreeWithinSign;
        return target;
    }

    static calculateHeliocentricChart(d) {
        const results = {};

        for (let i = 0; i < HELIOCENTRIC_PLANETS.length; i++) {
            const name = HELIOCENTRIC_PLANETS[i];
            const elements = computeElements(name, d, _pElements);
            const pos = computePosition(elements, 1, _pPos);
            const longitudeRad = Math.atan2(pos.y, pos.x);
            let longitudeDeg = longitudeRad * RAD2DEG;
            results[name] = this.getSignAndDegree(longitudeDeg);
        }

        return results;
    }

    static calculateGeocentricChart(d, target = null) {
        const results = target || {};

        // Use dedicated scratch variables to avoid being overwritten by planet loop
        const earthElements = computeElements('earth', d, _earthElements);
        const earthPos = computePosition(earthElements, 1, _earthPos);

        for (let i = 0; i < GEOCENTRIC_PLANETS.length; i++) {
            const name = GEOCENTRIC_PLANETS[i];
            let relX, relY;

            if (name === 'sun') {
                relX = -earthPos.x;
                relY = -earthPos.y;
            } else if (name === 'moon') {
                const elements = computeElements('moon', d, _pElements);
                const pPos = computePosition(elements, 1, _pPos);
                relX = pPos.x;
                relY = pPos.y;
            } else {
                const elements = computeElements(name, d, _pElements);
                const pPos = computePosition(elements, 1, _pPos);
                relX = pPos.x - earthPos.x;
                relY = pPos.y - earthPos.y;
            }

            const longitudeRad = Math.atan2(relY, relX);
            const longitudeDeg = longitudeRad * RAD2DEG;

            results[name] = this.getSignAndDegree(longitudeDeg, results[name]);
        }

        return results;
    }

    static formatDegree(degree) {
        const d = Math.floor(degree);
        const m = Math.floor((degree - d) * 60);
        return `${d}°${m.toString().padStart(2, '0')}'`;
    }

    static findAspect(long1, long2) {
        let diff = Math.abs(long1 - long2);
        if (diff > 180) diff = 360 - diff;

        // Use pre-cached list to avoid allocations
        for (let i = 0; i < ASPECT_TYPE_LIST.length; i++) {
            const entry = ASPECT_TYPE_LIST[i];
            const data = entry[1];
            const orb = Math.abs(diff - data.angle);
            if (orb <= data.orb) {
                // Return original data to include colorStr
                return { type: entry[0], orb, ...data };
            }
        }
        return null;
    }

    static calculateAspects(chart) {
        const aspects = [];
        const bodies = ALL_BODIES;

        // Pre-calculate longitudes to avoid redundant math in inner loop
        const longitudes = {};
        for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            const c = chart[b];
            if (c) {
                longitudes[b] = c.index * 30 + c.degree;
            }
        }

        for (let i = 0; i < bodies.length; i++) {
            const b1 = bodies[i];
            const long1 = longitudes[b1];
            if (long1 === undefined) continue;

            for (let j = i + 1; j < bodies.length; j++) {
                const b2 = bodies[j];
                const long2 = longitudes[b2];
                if (long2 === undefined) continue;

                const aspect = this.findAspect(long1, long2);
                if (aspect) {
                    aspects.push({ p1: b1, p2: b2, aspect: aspect });
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
                    if (ASPECT_PRIORITY[item.aspect.type] < ASPECT_PRIORITY[major.aspect.type]) {
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
            strategyKey = majorAspect.aspect.type.toLowerCase();
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

    static calculateElementBalance(chart, targetBalance = null) {
        const balance = targetBalance || { fire: 0, earth: 0, air: 0, water: 0 };
        balance.fire = 0;
        balance.earth = 0;
        balance.air = 0;
        balance.water = 0;

        for (const name in chart) {
            const info = chart[name];
            const element = ZODIAC_ELEMENTS[info.signId];
            if (element) balance[element]++;
        }

        let maxVal = -1;
        let dominant = 'none';
        for (const el in balance) {
            const count = balance[el];
            if (count > maxVal) {
                maxVal = count;
                dominant = el;
            }
        }

        return { balance, dominant };
    }

    static getArchetype(sunSignId, dominantElement) {
        if (!sunSignId || !dominantElement || dominantElement === 'none') {
            return null;
        }
        const naturalElement = ZODIAC_ELEMENTS[sunSignId];
        return `${sunSignId}_${naturalElement}`;
    }
}
