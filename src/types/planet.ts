export interface PlanetInfo {
  displayName: string
  description: string
  facts: string[]
  radius: string
  temp: string
  orbit: string
}

export interface LanguagePlanetData {
  [planetKey: string]: PlanetInfo
}

export interface PlanetDatabase {
  en: LanguagePlanetData
  zh: LanguagePlanetData
}
