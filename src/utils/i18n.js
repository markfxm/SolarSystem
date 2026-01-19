import { ref } from 'vue'

export const currentLang = ref('en')

const dict = {
  en: {
    nav_title: 'Solar System',
    control: {
      real: 'Real Time',
      realTime: 'Real Time',
      simTime: 'Sim Time',
      fast: '×500000 Speed',
      speed: 'Speed',
      home: 'Home',
      reset: 'Reset'
    },
    planet: {
      sun: 'Sun',
      mercury: 'Mercury',
      venus: 'Venus',
      earth: 'Earth',
      mars: 'Mars',
      jupiter: 'Jupiter',
      saturn: 'Saturn',
      uranus: 'Uranus',
      neptune: 'Neptune'
    },
    tour: {
      radius: 'Radius',
      temp: 'Temp',
      orbit: 'Orbit',
      did_you_know: 'Did you know?'
    }
  },
  zh: {
    nav_title: '太阳系',
    control: {
      real: '实时',
      realTime: '当前时间',
      simTime: '模拟时间',
      fast: '×500000 倍速',
      speed: '速度',
      home: '主页',
      reset: '归位'
    },
    planet: {
      sun: '太阳',
      mercury: '水星',
      venus: '金星',
      earth: '地球',
      mars: '火星',
      jupiter: '木星',
      saturn: '土星',
      uranus: '天王星',
      neptune: '海王星'
    },
    tour: {
      radius: '半径',
      temp: '温度',
      orbit: '轨道',
      did_you_know: '你知道吗？'
    }
  }
}

export function t(path) {
  const parts = path.split('.')
  let cur = dict[currentLang.value] || dict.en
  for (const p of parts) {
    cur = cur?.[p]
    if (cur === undefined) return path
  }
  return cur
}

export function setLang(lang) {
  if (dict[lang]) currentLang.value = lang
}
