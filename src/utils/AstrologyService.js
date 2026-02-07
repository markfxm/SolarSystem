import { computeD, computeElements, computePosition } from './Astronomy.js';

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

export const ZODIAC_ELEMENTS = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water'
};

const CALIBRATION_OFFSET = 1.7;

export class AstrologyService {
    static getSignAndDegree(longitude) {
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

    static calculateHeliocentricChart(date) {
        const d = computeD(date);
        const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
        const results = {};

        planets.forEach(name => {
            const elements = computeElements(name, d);
            const pos = computePosition(elements, 1);
            const longitudeRad = Math.atan2(pos.y, pos.x);
            let longitudeDeg = longitudeRad * (180 / Math.PI);
            results[name] = this.getSignAndDegree(longitudeDeg);
        });

        return results;
    }

    static calculateGeocentricChart(date) {
        const d = computeD(date);
        const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
        const results = {};

        const earthElements = computeElements('earth', d);
        const earthPos = computePosition(earthElements, 1);

        planets.forEach(name => {
            let relX, relY;

            if (name === 'sun') {
                relX = -earthPos.x;
                relY = -earthPos.y;
            } else if (name === 'moon') {
                const elements = computeElements('moon', d);
                const pPos = computePosition(elements, 1);
                relX = pPos.x;
                relY = pPos.y;
            } else {
                const elements = computeElements(name, d);
                const pPos = computePosition(elements, 1);
                relX = pPos.x - earthPos.x;
                relY = pPos.y - earthPos.y;
            }

            const longitudeRad = Math.atan2(relY, relX);
            const longitudeDeg = longitudeRad * (180 / Math.PI);

            results[name] = this.getSignAndDegree(longitudeDeg);
        });

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

        for (const [type, data] of Object.entries(ASPECT_TYPES)) {
            const orb = Math.abs(diff - data.angle);
            if (orb <= data.orb) {
                return { type, orb, ...data };
            }
        }
        return null;
    }

    static calculateAspects(chart) {
        const aspects = [];
        const bodies = Object.keys(chart);

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const b1 = bodies[i];
                const b2 = bodies[j];

                const long1 = chart[b1].index * 30 + chart[b1].degree;
                const long2 = chart[b2].index * 30 + chart[b2].degree;

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
        const priorityMap = {
            'CONJUNCTION': 1,
            'OPPOSITION': 2,
            'SQUARE': 3,
            'TRINE': 4,
            'SEXTILE': 5
        };

        aspects.forEach(item => {
            if (!major) {
                major = item;
            } else {
                const orbDiff = item.aspect.orb - major.aspect.orb;
                if (orbDiff < -1.0) {
                    major = item;
                } else if (Math.abs(orbDiff) <= 1.0) {
                    if (priorityMap[item.aspect.type.toUpperCase()] < priorityMap[major.aspect.type.toUpperCase()]) {
                        major = item;
                    }
                }
            }
        });

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

    static calculateElementBalance(chart) {
        const balance = { fire: 0, earth: 0, air: 0, water: 0 };
        const bodies = Object.keys(chart);

        bodies.forEach(name => {
            const signId = chart[name].signId;
            const element = ZODIAC_ELEMENTS[signId];
            if (element) balance[element]++;
        });

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

    static getArchetype(sunSignId, dominantElement) {
        if (!sunSignId || !dominantElement || dominantElement === 'none') {
            return null;
        }
        const naturalElement = ZODIAC_ELEMENTS[sunSignId];
        return `${sunSignId}_${naturalElement}`;
    }
}
