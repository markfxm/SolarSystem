import { computeD, computeElements, computePosition } from './Astronomy.js';

export const ZODIAC_SIGNS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

export const ASPECT_TYPES = {
    CONJUNCTION: { angle: 0, orb: 8, color: 0xffffff, label: 'aspect.conjunction' },
    OPPOSITION: { angle: 180, orb: 8, color: 0xff3333, label: 'aspect.opposition' },
    TRINE: { angle: 120, orb: 8, color: 0x33ff88, label: 'aspect.trine' },
    SQUARE: { angle: 90, orb: 7, color: 0x00aaff, label: 'aspect.square' }, // Changed from 0x4444ff for better visibility
    SEXTILE: { angle: 60, orb: 6, color: 0xffcc33, label: 'aspect.sextile' }
};

export const ZODIAC_ELEMENTS = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water'
};

// Calibration: Offset to align with standard zodiac dates.
// Reduced by 1.0 from 2.7 to 1.7 to fix the 1-day "too early" error reported by user.
const CALIBRATION_OFFSET = 1.7;

export class AstrologyService {
    /**
     * Converts a degree (0-360) to a sign index and the degree within that sign.
     */
    static getSignAndDegree(longitude) {
        // Apply calibration offset
        let normalized = (longitude + CALIBRATION_OFFSET) % 360;
        if (normalized < 0) normalized += 360;

        const signIndex = Math.floor(normalized / 30);
        const degreeWithinSign = normalized % 30;

        return {
            index: signIndex,
            signId: ZODIAC_SIGNS[signIndex],
            degree: degreeWithinSign
        };
    }

    /**
     * Calculates the position of all planets relative to the Sun (Heliocentric)
     */
    static calculateHeliocentricChart(date) {
        const d = computeD(date);
        const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
        const results = {};

        planets.forEach(name => {
            const elements = computeElements(name, d);
            const pos = computePosition(elements, 1); // scale doesn't matter for angle

            // Calculate longitude in the XY plane (Ecliptic)
            // Math.atan2 returns angle in radians
            const longitudeRad = Math.atan2(pos.y, pos.x);
            let longitudeDeg = longitudeRad * (180 / Math.PI);

            results[name] = this.getSignAndDegree(longitudeDeg);
        });

        return results;
    }

    /**
     * Calculates the position of all planets relative to the Earth (Geocentric)
     * This is what traditional astrology uses.
     */
    static calculateGeocentricChart(date) {
        const d = computeD(date);
        const planets = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
        const results = {};

        // 1. Get Earth's position relative to Sun
        const earthElements = computeElements('earth', d);
        const earthPos = computePosition(earthElements, 1);

        planets.forEach(name => {
            let pPos;
            if (name === 'sun') {
                // Sun relative to Earth is simply negative Earth relative to Sun
                pPos = { x: 0, y: 0, z: 0 };
            } else {
                const elements = computeElements(name, d);
                pPos = computePosition(elements, 1);
            }

            // Geocentric coordinate = Planet_Helio - Earth_Helio
            const relX = pPos.x - earthPos.x;
            const relY = pPos.y - earthPos.y;

            const longitudeRad = Math.atan2(relY, relX);
            const longitudeDeg = longitudeRad * (180 / Math.PI);

            results[name] = this.getSignAndDegree(longitudeDeg);
        });

        return results;
    }

    /**
     * Formats a degree for professional display (e.g., 15°30')
     */
    static formatDegree(degree) {
        const d = Math.floor(degree);
        const m = Math.floor((degree - d) * 60);
        return `${d}°${m.toString().padStart(2, '0')}'`;
    }

    /**
     * Finds active aspects between two longitudes
     */
    static findAspect(long1, long2) {
        let diff = Math.abs(long1 - long2);
        if (diff > 180) diff = 360 - diff;

        for (const [type, data] of Object.entries(ASPECT_TYPES)) {
            if (Math.abs(diff - data.angle) <= data.orb) {
                return { type, ...data };
            }
        }
        return null;
    }

    /**
     * Gets all major aspects between planets in a chart
     */
    static calculateAspects(chart) {
        const aspects = [];
        const bodies = Object.keys(chart);

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const b1 = bodies[i];
                const b2 = bodies[j];

                // Get raw longitudes (index * 30 + degree)
                const long1 = chart[b1].index * 30 + chart[b1].degree;
                const long2 = chart[b2].index * 30 + chart[b2].degree;

                const aspect = this.findAspect(long1, long2);
                if (aspect) {
                    aspects.push({
                        p1: b1,
                        p2: b2,
                        aspect: aspect
                    });
                }
            }
        }
        return aspects;
    }

    /**
     * Calculates the balance of elements (Fire, Earth, Air, Water)
     */
    static calculateElementBalance(chart) {
        const balance = { fire: 0, earth: 0, air: 0, water: 0 };
        const bodies = Object.keys(chart);

        bodies.forEach(name => {
            const signId = chart[name].signId;
            const element = ZODIAC_ELEMENTS[signId];
            if (element) balance[element]++;
        });

        // Find dominant element
        let maxVal = -1;
        let dominant = 'none';
        for (const [el, count] of Object.entries(balance)) {
            if (count > maxVal) {
                maxVal = count;
                dominant = el;
            }
        }

        return { balance, dominant };
    }
}
