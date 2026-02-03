import { ref } from 'vue'

const SAVED_LANG_KEY = 'preferredLanguage'
const defaultLang = localStorage.getItem(SAVED_LANG_KEY) || 'en'

export const currentLang = ref(defaultLang)

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
      reset: 'Reset',
      zodiac: 'Zodiac Ring'
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
      neptune: 'Neptune',
      moon: 'Moon'
    },
    zodiac_names: [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ],
    tour: {
      radius: 'Radius',
      temp: 'Temp',
      orbit: 'Orbit',
      did_you_know: 'Did you know?'
    },
    stellar: {
      btn: 'Stellar Snapshot',
      title: 'Stellar Snapshot',
      desc: 'Pick a significant date to see the planets align.',
      dateLabel: 'Select Date',
      capture: 'Capture 4K Snapshot',
      capturing: 'Capturing...',
      tip: 'The UI will be hidden for high-res capture.',
      download: 'Download Snapshot',
      save: 'Save to Device',
      discard: 'Discard & Retake',
      review: 'Review your snapshot',
      enlarge: 'Enlarge View',
      ratio: '1. Select Ratio',
      theme: '2. Select Theme',
      generate: 'Apply Art Style',
      theme_cinematic: 'Cinematic',
      theme_blueprint: 'Blueprint',
      theme_vintage: 'Vintage',
      theme_golden: 'Golden Record'
    },
    aspect: {
      conjunction: 'Conjunction',
      opposition: 'Opposition',
      trine: 'Trine',
      square: 'Square',
      sextile: 'Sextile'
    },
    transit: {
      positions: 'Celestial positions',
      active_aspects: 'Active Aspects'
    },
    insight: {
      vibe: 'Cosmic Vibe',
      fire: 'Action & Passion',
      earth: 'Stability & Growth',
      air: 'Ideas & Social',
      water: 'Feeling & Intuition',
      tip_conjunction: 'Fused energy: Intense focus',
      tip_opposition: 'Tension: Needs balance',
      tip_trine: 'Harmony: Talents flowing',
      tip_square: 'Challenge: Growth through friction',
      tip_sextile: 'Opportunity: Creative spark'
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
      reset: '归位',
      zodiac: '十二宫环'
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
      neptune: '海王星',
      moon: '月球'
    },
    zodiac_names: [
      '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
      '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'
    ],
    tour: {
      radius: '半径',
      temp: '温度',
      orbit: '轨道',
      did_you_know: '你知道吗？'
    },
    stellar: {
      btn: '星空快照',
      title: '星空瞬间',
      desc: '选择一个特殊的日子，查看那一刻的行星排列。',
      dateLabel: '选择日期',
      capture: '捕捉 4K 高清快照',
      capturing: '正在捕捉...',
      tip: '快照时 UI 将自动隐藏。',
      download: '下载快照',
      save: '保存到设备',
      discard: '放弃并重拍',
      review: '预览你的星空瞬间',
      enlarge: '放大查看',
      ratio: '1. 选择比例',
      theme: '2. 选择主题',
      generate: '生成艺术海报',
      theme_cinematic: '电影感',
      theme_blueprint: '蓝图',
      theme_vintage: '复古',
      theme_golden: '黄金唱片'
    },
    aspect: {
      conjunction: '合相',
      opposition: '对冲',
      trine: '三分相',
      square: '四分相',
      sextile: '六分相'
    },
    transit: {
      positions: '行星位置',
      active_aspects: '当前相位'
    },
    insight: {
      vibe: '宇宙能量',
      fire: '行动与热忱',
      earth: '务实与积淀',
      air: '灵感与交流',
      water: '情感与直觉',
      tip_conjunction: '能量融合：极度聚焦',
      tip_opposition: '拉扯对抗：寻找平衡',
      tip_trine: '顺遂和谐：天赋流淌',
      tip_square: '摩擦挑战：磨练成长',
      tip_sextile: '潜在机遇：创意火花'
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
  if (dict[lang]) {
    currentLang.value = lang
    localStorage.setItem(SAVED_LANG_KEY, lang)
  }
}
