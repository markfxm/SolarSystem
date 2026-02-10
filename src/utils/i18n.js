import { ref } from 'vue'

const SAVED_LANG_KEY = 'preferredLanguage'
const defaultLang = localStorage.getItem(SAVED_LANG_KEY) || 'en'

export const currentLang = ref(defaultLang)

const dict = {
  en: {
    nav_title: 'Solar System',
    nav: {
      show_info: 'Show Information',
      back_to_button: 'Back to Solar System'
    },
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
    info: {
      radius: 'Radius',
      temp: 'Temp',
      orbit: 'Orbit',
      did_you_know: 'Did you know?',
      land_btn: 'Land on Mars'
    },
    mars: {
      entering: 'ENTERING MARS ATMOSPHERE...',
      return_orbit: 'Return to Orbit'
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
    planet_meaning: {
      sun: 'Self & Ego',
      mercury: 'Communication',
      venus: 'Love & Values',
      earth: 'Home & Life',
      mars: 'Action & Drive',
      jupiter: 'Expansion & Luck',
      saturn: 'Discipline & Karma',
      uranus: 'Innovation & Change',
      neptune: 'Dreams & Illusion',
      moon: 'Emotions & Instincts'
    },
    sign_keywords: {
      aries: 'Bold',
      taurus: 'Stable',
      gemini: 'Curious',
      cancer: 'Nurturing',
      leo: 'Radiant',
      virgo: 'Precise',
      libra: 'Harmonious',
      scorpio: 'Intense',
      sagittarius: 'Adventurous',
      capricorn: 'Ambitious',
      aquarius: 'Unique',
      pisces: 'Dreamy'
    },
    aspect: {
      conjunction: '🤝 Unity',
      opposition: '🏹 Tension',
      trine: '🍀 Flow',
      square: '🚧 Friction',
      sextile: '✨ Spark'
    },
    transit: {
      positions: 'Planet Locations',
      active_aspects: 'Cosmic Conversations',
      archetype: 'Cosmic Archetype'
    },
    insight: {
      vibe: 'Current Mood',
      fire: '🔥 Passion & Drive',
      earth: '🏔️ Practical & Steady',
      air: '💨 Thoughts & Talk',
      water: '🌊 Deep Feelings',
      tip_conjunction: 'Strong focus & intensity',
      tip_opposition: 'Need for balance',
      tip_trine: 'Luck & natural talent',
      tip_square: 'Growth through challenge',
      tip_sextile: 'Creative opportunity'
    },
    archetype: {
      // Fire
      aries_fire: 'The Trailblazer',
      leo_fire: 'The Radiant King/Queen',
      sagittarius_fire: 'The Explorer',
      // Earth
      taurus_earth: 'The Builder',
      virgo_earth: 'The Perfectionist',
      capricorn_earth: 'The Mastermind',
      // Air
      gemini_air: 'The Messenger',
      libra_air: 'The Diplomat',
      aquarius_air: 'The Visionary',
      // Water
      cancer_water: 'The Guardian',
      scorpio_water: 'The Mystic',
      pisces_water: 'The Dreamer'
    },
    report: {
      title: 'Cosmic Report',
      toggle_show: 'Show Full Details',
      toggle_hide: 'Hide Details',
      identity: 'The Sun in {sunSign} ({sunKey}) illuminates your core self, while the Moon in {moonSign} ({moonKey}) colors your inner emotional world.',
      aspect: 'A key dynamic is the {type} between {p1} and {p2}, creating {vibe}.',
      no_aspect: 'The skies are relatively calm, with each planet expressing its energy clearly without major interference.'
    },
    guidance: {
      sun: {
        aries: "To be a pioneer. Your life's purpose is to break new ground and assert your individuality.",
        taurus: "To be a builder. Your path to fulfillment lies in creating stability, beauty, and lasting value.",
        gemini: "To be a messenger. You are here to learn, communicate, and connect diverse ideas.",
        cancer: "To be a protector. Your strength comes from nurturing others and creating emotional safety.",
        leo: "To be a creator. You shine brightest when you express your unique self and lead with heart.",
        virgo: "To be a healer. Your gift is seeing the details and improving the world through service.",
        libra: "To be a peacemaker. You thrive by creating harmony, balance, and fair relationships.",
        scorpio: "To be a transformer. Your power lies in navigating the depths and mastering crisis.",
        sagittarius: "To be a seeker. Your mission is to explore truth, wisdom, and new horizons.",
        capricorn: "To be an achiever. You find meaning in mastery, responsibility, and climbing the mountain.",
        aquarius: "To be a visionary. You are here to innovate and contribute to the collective future.",
        pisces: "To be a mystic. Your path involves dissolving boundaries and connecting with the universal."
      },
      moon_deep: {
        aries: "You need action and independence to feel secure. Emotional release comes through movement and direct expression.",
        taurus: "You need comfort, stability, and sensory pleasures. Peace comes from a secure environment and good food.",
        gemini: "You need variety and conversation. You feel best when you can talk through your feelings and learn new things.",
        cancer: "You need deep emotional bonding and safety. Home and family are your sanctuary where you recharge.",
        leo: "You need validation and creative outlets. You feel loved when you are appreciated and can express your heart.",
        virgo: "You need order and clarity. You feel secure when things are organized and you can be of service.",
        libra: "You need harmony and partnership. You feel at peace when your relationships are balanced and beautiful.",
        scorpio: "You need intensity and deep trust. You find safety in knowing the absolute truth and sharing secrets.",
        sagittarius: "You need freedom and meaning. You feel emotionally nourished when exploring new horizons and philosophies.",
        capricorn: "You need respect and competence. You feel secure when you have a clear goal and are in control.",
        aquarius: "You need freedom to be unique. You feel safe when you can detach and connect intellectually with groups.",
        pisces: "You need spiritual connection and solitude. You find peace in dreams, music, and merging with the divine."
      },
      strategy: {
        conjunction: "{p1} and {p2} are merging forces: Focus your energy. This alignment gives you intense power in this area.",
        opposition: "{p1} and {p2} are facing off: Find the middle ground. Success comes from balancing these two opposing needs.",
        square: "{p1} and {p2} are in tension: Break through. Use the friction as fuel to overcome obstacles and grow stronger.",
        trine: "{p1} and {p2} are in harmony: Go with the flow. Trust your natural talents and let things happen easily.",
        sextile: "{p1} and {p2} offer a spark: Seize the opportunity. A door is open between these two, but you must take the first step."
      }
    }
  },
  zh: {
    nav_title: '太阳系',
    nav: {
      show_info: '查看介绍',
      back_to_button: '返回太阳系'
    },
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
    info: {
      radius: '半径',
      temp: '温度',
      orbit: '轨道',
      did_you_know: '你知道吗？',
      land_btn: '登陆火星'
    },
    mars: {
      entering: '正在进入火星大气层...',
      return_orbit: '返回轨道'
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
    planet_meaning: {
      sun: '自我与显意识',
      mercury: '思维与沟通',
      venus: '爱情与价值观',
      earth: '家园与生命',
      mars: '行动与驱力',
      jupiter: '扩张与幸运',
      saturn: '责任与磨难',
      uranus: '变革与创新',
      neptune: '梦想与幻觉',
      moon: '情绪与潜意识'
    },
    sign_keywords: {
      aries: '无畏',
      taurus: '稳健',
      gemini: '好奇',
      cancer: '滋养',
      leo: '耀眼',
      virgo: '精细',
      libra: '和谐',
      scorpio: '深刻',
      sagittarius: '探索',
      capricorn: '野心',
      aquarius: '独特',
      pisces: '梦幻'
    },
    aspect: {
      conjunction: '🤝 强强联手',
      opposition: '🏹 拉扯对抗',
      trine: '🍀 天赋流淌',
      square: '🚧 磨练成长',
      sextile: '✨ 此刻心动'
    },
    transit: {
      positions: '星体驻地',
      active_aspects: '星际对话',
      archetype: '宇宙原力'
    },
    insight: {
      vibe: '今日气场',
      fire: '🔥 燃起来了',
      earth: '🏔️ 稳扎稳打',
      air: '💨 脑洞大开',
      water: '🌊 情感丰富',
      tip_conjunction: '能量爆表：此时此刻全力以赴',
      tip_opposition: '左右为难：需要寻找平衡点',
      tip_trine: '顺风顺水：好运挡都挡不住',
      tip_square: '逆风翻盘：压力就是动力',
      tip_sextile: '灵光一现：抓住那个小机会'
    },
    archetype: {
      // Fire
      aries_fire: '🔥 不羁的开拓者',
      leo_fire: '👑 也是没谁了的王者',
      sagittarius_fire: '🏹 自由的灵魂',
      // Earth
      taurus_earth: '🧱 靠谱的建设者',
      virgo_earth: '🧐 细节控完美主义',
      capricorn_earth: '🏔️ 幕后的大佬',
      // Air
      gemini_air: '⚡ 原地起飞的机灵鬼',
      libra_air: '⚖️ 端水大师',
      aquarius_air: '👽 来自未来的脑洞',
      // Water
      cancer_water: '🛡️ 温柔的守护神',
      scorpio_water: '🦂 深不可测的神秘人',
      pisces_water: '🛁 做梦的艺术家'
    },
    report: {
      title: '星际报告',
      toggle_show: '显示详细数据',
      toggle_hide: '收起详细数据',
      identity: '太阳位于{sunSign}（{sunKey}），照亮了你的核心自我；而月亮落在{moonSign}（{moonKey}），为你的内心世界染上了色彩。',
      aspect: '值得关注的是{p1}与{p2}形成的{type}，这带来了一种{vibe}的能量。',
      no_aspect: '星象相对平静，各行星能量表达顺畅，未受到显著干扰。'
    },
    guidance: {
      sun: {
        aries: "成为先锋。你的人生使命是开辟新天地，彰显你的独特性。",
        taurus: "成为建设者。你的成就感来自于创造稳定、美感和持久的价值。",
        gemini: "成为信使。你来此是为了学习、交流并将不同的想法连接起来。",
        cancer: "成为守护者。你的力量源于滋养他人并创造情感上的安全感。",
        leo: "成为创造者。当你发自内心地表达自我并引领他人时，你最耀眼。",
        virgo: "成为疗愈者。你的天赋在于洞察细节，并通过服务改善世界。",
        libra: "成为和平使者。这种成就在于创造和谐、平衡和公平的关系。",
        scorpio: "成为转化者。你的力量在于驾驭深层危机并从中重生。",
        sagittarius: "成为探索者。你的使命是追寻真理、智慧和新的地平线。",
        capricorn: "成为成就者。你在通过攀登高峰、承担责任和磨练技艺中找到意义。",
        aquarius: "成为变革者。你来此是为了创新并为集体的未来做出贡献。",
        pisces: "成为神秘家。你的道路涉及消融界限，与宇宙的无限性连接。"
      },
      moon_deep: {
        aries: "你需要行动和独立才能感到安全。通过运动和直接表达来释放情绪是你的本能。",
        taurus: "你需要舒适、稳定和感官享受。内心的平静来自于安全的环境和美好的物质生活。",
        gemini: "你需要变化和交流。当你能通过对话理清思绪并学习新事物时，状态最好。",
        cancer: "你需要深层的情感连接和安全感。家和家人是你充电的避风港。",
        leo: "你需要认可和创造性的出口。当你被欣赏并能表达心声时，你会感到被爱。",
        virgo: "你需要秩序和清晰。当一切井井有条且你能提供帮助时，你感到最安全。",
        libra: "你需要和谐与伴侣关系。当你的关系平衡且充满美感时，你内心最平静。",
        scorpio: "你需要强度和深层的信任。在掌握绝对真相和分享秘密中，你找到安全感。",
        sagittarius: "你需要自由和意义。当探索新的地平线和哲学时，你的情感得到滋养。",
        capricorn: "你需要尊重和能力。当你有一个清晰的目标并掌控局面时，你感到安全。",
        aquarius: "你需要做独特的自己。当你能保持独立并通过理智与群体连接时，你感到安全。",
        pisces: "你需要精神连接和独处。你在梦想、音乐和与神性的融合中找到平静。"
      },
      strategy: {
        conjunction: "{p1}与{p2}强强联手：聚焦能量。这种力量的融合赋予你在该领域强烈的爆发力。",
        opposition: "{p1}与{p2}拉扯对抗：寻找平衡。成功来自于在两个对立的需求之间找到中间点。",
        square: "{p1}与{p2}磨练成长：突破限制。利用这种摩擦作为燃料，克服障碍并变得更强。",
        trine: "{p1}与{p2}天赋流淌：顺势而为。信任你的自然天赋，让事情自然发生。",
        sextile: "{p1}与{p2}此刻心动：抓住机会。一扇门已经打开，但你需要迈出第一步。"
      }
    }
  }
}


export function t(path, vars = null) {
  const parts = path.split('.')
  let cur = dict[currentLang.value] || dict.en
  for (const p of parts) {
    cur = cur?.[p]
    if (cur === undefined) return path
  }

  if (vars && typeof cur === 'string') {
    Object.keys(vars).forEach(key => {
      cur = cur.replace(new RegExp(`\\{${key}\\}`, 'g'), vars[key])
    })
  }

  return cur
}

export function setLang(lang) {
  if (dict[lang]) {
    currentLang.value = lang
    localStorage.setItem(SAVED_LANG_KEY, lang)
  }
}
