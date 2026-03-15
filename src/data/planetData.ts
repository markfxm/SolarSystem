import type { PlanetDatabase } from '../types/planet'

export const PLANET_DATA: PlanetDatabase = {
    en: {
        sun: {
            displayName: "The Sun",
            description: "The big boss. Ideally, don't stare at it. It accounts for 99.86% of the total mass of the entire Solar System, meaning we are all basically just orbital debris.",
            facts: [
                "It's a G-type main-sequence star (Yellow Dwarf).",
                "Core temperature is 15 million °C.",
                "Light takes 8 minutes to reach Earth."
            ],
            radius: "696,340 km",
            temp: "5,500°C (Surface)",
            orbit: "N/A"
        },
        moon: {
            displayName: "The Moon",
            description: "Earth's loyal companion. It stabilizes our planet's wobble and creates tides. It's tidally locked, meaning we always see the same face. It's also the only other celestial body humans have set foot on.",
            facts: [
                "It is slowly moving away from Earth (3.8cm/year).",
                "There is no 'dark side', only a 'far side'.",
                "Footprints left by astronauts will last millions of years."
            ],
            radius: "1,737 km",
            temp: "-130°C to 120°C",
            orbit: "27.3 Days"
        },
        mercury: {
            displayName: "Mercury",
            description: "The speed demon. It orbits faster than any other planet but rotates so slowly that one 'day' lasts two years. Also, it has no atmosphere, so if you visited, you'd be speechless.",
            facts: [
                "Smallest planet in the solar system.",
                "Shrinking as its iron core cools.",
                "Temperatures swing from 430°C to -180°C."
            ],
            radius: "2,439 km",
            temp: "167°C (Avg)",
            orbit: "88 Earth Days"
        },
        venus: {
            displayName: "Venus",
            description: "Earth's 'Evil Twin'. It's the hottest planet because of a runaway greenhouse effect. It also spins backward, so the sun rises in the west. Rebellious.",
            facts: [
                "Hottest planet (465°C), hot enough to melt lead.",
                "Atmospheric pressure is 90x that of Earth.",
                "A day on Venus is longer than a year on Venus."
            ],
            radius: "6,051 km",
            temp: "464°C",
            orbit: "225 Earth Days"
        },
        earth: {
            displayName: "Earth",
            description: "The Blue Marble. Currently the only known place in the universe with pizza, penguins, and free WiFi (sometimes).",
            facts: [
                "The only planet not named after a god.",
                "70% covered by water.",
                "Traveling at 67,000 mph right now."
            ],
            radius: "6,371 km",
            temp: "15°C (Avg)",
            orbit: "365.25 Days"
        },
        mars: {
            displayName: "Mars",
            description: "The Red Planet. Currently inhabited entirely by robots. It has the tallest mountain in the solar system, Olympus Mons, which is 3x the height of Everest.",
            facts: [
                "Red color comes from iron oxide (rust).",
                "Has two tiny moons: Phobos and Deimos.",
                "Sunset on Mars looks blue."
            ],
            radius: "3,389 km",
            temp: "-65°C",
            orbit: "687 Days"
        },
        jupiter: {
            displayName: "Jupiter",
            description: "The King. A gas giant so massive that it protects Earth by deflecting comets. It has a storm called the Great Red Spot that has been raging for 300 years.",
            facts: [
                "Massive enough to fit 1,300 Earths inside.",
                "Has the shortest day of all planets (9h 55m).",
                "Has at least 95 moons."
            ],
            radius: "69,911 km",
            temp: "-110°C",
            orbit: "12 Years"
        },
        saturn: {
            displayName: "Saturn",
            description: "Lord of the Rings. It's the most photogenic planet. It's primarily made of hydrogen and helium and is the only planet that is less dense than water—it would float in a giant bathtub!",
            facts: [
                "Rings are made of ice, rock, and dust.",
                "Winds can reach 1,800 km/h.",
                "Titan (its moon) has liquid methane lakes."
            ],
            radius: "58,232 km",
            temp: "-140°C",
            orbit: "29 Years"
        },
        uranus: {
            displayName: "Uranus",
            description: "The Ice Giant with a unique personality—it spins on its side, rolling around the sun like a ball. It has very faint rings and smells like rotten eggs due to hydrogen sulfide.",
            facts: [
                "Coldest planetary atmosphere (-224°C).",
                "Axis is tilted 98 degrees.",
                "First planet found using a telescope."
            ],
            radius: "25,362 km",
            temp: "-195°C",
            orbit: "84 Years"
        },
        neptune: {
            displayName: "Neptune",
            description: "The Windy One. It's dark, cold, and whipped by supersonic winds. It was the first planet predicted by math before being observed.",
            facts: [
                "Winds reach 2,100 km/h (Mach 1.7).",
                "Completes one orbit every 165 years.",
                "It rains diamonds (theoretically)."
            ],
            radius: "24,622 km",
            temp: "-200°C",
            orbit: "165 Years"
        }
    },
    zh: {
        sun: {
            displayName: "太阳",
            description: "大老板。最好别盯着它看。它占据了整个太阳系总质量的99.86%，这意味着我们基本上只是它的轨道碎片。",
            facts: [
                "它是一颗G型主序星（黄矮星）。",
                "核心温度高达1500万摄氏度。",
                "光到达地球需要8分钟。"
            ],
            radius: "696,340 km",
            temp: "5,500°C (表面)",
            orbit: "N/A"
        },
        moon: {
            displayName: "月球",
            description: "地球的忠实伴侣。它稳定了我们星球的摆动并引起潮汐。它被潮汐锁定，意味着我们永远只能看到同一面。这也是人类唯一踏足过的地外天体。",
            facts: [
                "它正在慢慢远离地球（每年3.8厘米）。",
                "没有“暗面”，只有“远背面”。",
                "宇航员留下的脚印将保留数百万年。"
            ],
            radius: "1,737 km",
            temp: "-130°C 至 120°C",
            orbit: "27.3 天"
        },
        mercury: {
            displayName: "水星",
            description: "速度恶魔。它的公转速度比任何行星都快，但自转非常慢，仅仅“一天”就持续两年。而且它没有大气层，如果你去那里，你会“无话可说”。",
            facts: [
                "太阳系中最小的行星。",
                "随着铁核冷却，在这个其实正在缩小。",
                "温度在430°C到-180°C之间剧烈波动。"
            ],
            radius: "2,439 km",
            temp: "167°C (平均)",
            orbit: "88 地球日"
        },
        venus: {
            displayName: "金星",
            description: "地球的“邪恶双胞胎”。由于失控的温室效应，它是最热的行星。它的自转是反向的，所以太阳从西边升起。真是叛逆。",
            facts: [
                "最热的行星（465°C），足以融化铅。",
                "大气压是地球的90倍。",
                "金星上的一天比金星上的一年还要长。"
            ],
            radius: "6,051 km",
            temp: "464°C",
            orbit: "225 地球日"
        },
        earth: {
            displayName: "地球",
            description: "蓝色弹珠。目前宇宙中唯一已知有披萨、企鹅和（有时）免费WiFi的地方。",
            facts: [
                "唯一一颗不以神的名字命名的行星。",
                "70%的表面被水覆盖。",
                "正以每小时67,000英里的速度飞驰。"
            ],
            radius: "6,371 km",
            temp: "15°C (平均)",
            orbit: "365.25 天"
        },
        mars: {
            displayName: "火星",
            description: "红色星球。目前居民全是机器人。它拥有太阳系最高的山——奥林帕斯山，高度是珠穆朗玛峰的3倍。",
            facts: [
                "红色来自于氧化铁（生锈）。",
                "有两颗微小的卫星：火卫一和火卫二。",
                "火星上的日落看起来是蓝色的。"
            ],
            radius: "3,389 km",
            temp: "-65°C",
            orbit: "687 天"
        },
        jupiter: {
            displayName: "木星",
            description: "国王。这颗气态巨行星质量巨大，通过偏转彗星来保护地球。它有一个被称为大红斑的风暴，已经肆虐了300年。",
            facts: [
                "质量大到可以装下1300个地球。",
                "自转最快，一天只有9小时55分。",
                "拥有至少95颗卫星。"
            ],
            radius: "69,911 km",
            temp: "-110°C",
            orbit: "12 年"
        },
        saturn: {
            displayName: "土星",
            description: "指环王。它是最上镜的行星。主要由氢和氦组成，是唯一密度小于水的行星——如果有一个足够大的浴缸，它可以浮在水面上！",
            facts: [
                "光环由冰、岩石和尘埃组成。",
                "风速可达1,800公里/小时。",
                "土卫六（泰坦）拥有液态甲烷湖泊。"
            ],
            radius: "58,232 km",
            temp: "-140°C",
            orbit: "29 年"
        },
        uranus: {
            displayName: "天王星",
            description: "个性独特的冰巨星——它侧躺着自转，像个球一样绕着太阳滚。光环很暗，而且因为硫化氢的原因，闻起来像臭鸡蛋。",
            facts: [
                "拥有最冷的大气层（-224°C）。",
                "自转轴倾斜98度。",
                "第一颗使用望远镜发现的行星。"
            ],
            radius: "25,362 km",
            temp: "-195°C",
            orbit: "84 年"
        },
        neptune: {
            displayName: "海王星",
            description: "多风的家伙。黑暗、寒冷，被超音速狂风肆虐。它是第一颗在被观测到之前先通过数学预测出来的行星。",
            facts: [
                "风速达到2,100公里/小时（1.7马赫）。",
                "公转一周需要165年。",
                "理论上它会下钻石雨。"
            ],
            radius: "24,622 km",
            temp: "-200°C",
            orbit: "165 年"
        }
    }
}
