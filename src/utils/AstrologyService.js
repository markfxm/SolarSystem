import { computeD, computeElements, computePosition } from './Astronomy.js';

export const ZODIAC_SIGNS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

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
}
