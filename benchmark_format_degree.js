import { performance } from 'perf_hooks';

const MINUTES_CACHE = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const DEGREE_STR_CACHE = Array.from({ length: 360 }, (_, i) => i + '°');

// Current implementation
function formatDegreeOld(degree) {
    const d = Math.floor(degree);
    const m = Math.floor((degree - d) * 60);
    return (DEGREE_STR_CACHE[d] || (d + '°')) + (MINUTES_CACHE[m] || '00') + "'";
}

// Optimized implementation (Full 2D Cache)
const FULL_CACHE = Array.from({ length: 360 }, (_, d) => {
    const dStr = DEGREE_STR_CACHE[d];
    return Array.from({ length: 60 }, (_, m) => dStr + MINUTES_CACHE[m] + "'");
});

function formatDegreeNew(degree) {
    const d = Math.floor(degree);
    const m = Math.floor((degree - d) * 60);
    return FULL_CACHE[d][m];
}

// Warm up
for (let i = 0; i < 10000; i++) {
    formatDegreeOld(Math.random() * 360);
    formatDegreeNew(Math.random() * 360);
}

const iterations = 1000000;
const testValues = Array.from({ length: 10000 }, () => Math.random() * 360);

console.log(`⚡ Bolt: Benchmarking formatDegree with ${iterations} iterations...`);

let start = performance.now();
for (let i = 0; i < iterations; i++) {
    formatDegreeOld(testValues[i % 10000]);
}
let end = performance.now();
const oldTime = end - start;
console.log(`Old Implementation: ${oldTime.toFixed(2)}ms`);

start = performance.now();
for (let i = 0; i < iterations; i++) {
    formatDegreeNew(testValues[i % 10000]);
}
end = performance.now();
const newTime = end - start;
console.log(`New Implementation: ${newTime.toFixed(2)}ms`);

const speedup = ((oldTime / newTime) - 1) * 100;
console.log(`Speedup: ${speedup.toFixed(1)}%`);

const memorySaved = iterations * 10; // ~10 bytes per string allocation saved
console.log(`Theoretical allocations saved: ~${(memorySaved / 1024 / 1024).toFixed(2)} MB over 1M calls`);
