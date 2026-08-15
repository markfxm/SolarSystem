import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'

globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            clearRect: () => {},
            measureText: () => ({ width: 50 }),
            fillText: () => {},
            font: '',
            fillStyle: '',
            textAlign: '',
            textBaseline: '',
            shadowColor: '',
            shadowBlur: 0
          })
        }
      }
      return {}
    }
  }
}

const { createZodiacRing } = await import('../utils/ZodiacRing.js')

test('createZodiacRing constructs ring, ticks, and label sprites correctly', () => {
  const names = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
  const ringGroup = createZodiacRing(10000, names)

  assert.equal(ringGroup.name, 'ZodiacRing')
  assert.equal(ringGroup.matrixAutoUpdate, false)

  // Children: 1 ring line + 1 tick segments + 12 sprites = 14 children
  assert.equal(ringGroup.children.length, 14)

  const ringLine = ringGroup.children[0]
  assert.equal(ringLine.matrixAutoUpdate, false)

  const tickSegments = ringGroup.children[1]
  assert.equal(tickSegments.matrixAutoUpdate, false)

  // Verify the 12 sprites
  for (let i = 2; i < 14; i++) {
    const sprite = ringGroup.children[i]
    assert.equal(sprite.isSprite, true)
    assert.equal(sprite.matrixAutoUpdate, false)
  }
})

test('createZodiacRing updateLabels updates sprite materials', () => {
  const initialNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
  const ringGroup = createZodiacRing(10000, initialNames)

  const newNames = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座']
  ringGroup.updateLabels(newNames)

  // Verify sprites still exist and updated without throwing
  assert.equal(ringGroup.children.length, 14)
})
