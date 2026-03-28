/**
 * BookSearchService - A lightweight utility for searching through book content.
 * Used as a fallback while the main AI model is downloading.
 */

class BookSearchService {
  constructor() {
    this.books = []
    this.isLoaded = false
  }

  async init() {
    if (this.isLoaded) return
    try {
      // In a real scenario, this could be a fetch to a JSON file
      // For now, we'll try to import it if it exists, or start empty
      const response = await fetch('/data/books.json').catch(() => null)
      if (response && response.ok) {
        this.books = await response.json()
      } else {
        // Fallback or empty
        this.books = []
      }
      this.isLoaded = true
    } catch (e) {
      console.warn("BookSearchService: Failed to load books.json", e)
      this.isLoaded = true // Mark as loaded anyway to avoid repeated failed attempts
    }
  }

  /**
   * Search for the most relevant snippets based on query
   * @param {string} query
   * @returns {string|null}
   */
  search(query) {
    if (!this.books || this.books.length === 0) return null

    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1)
    if (keywords.length === 0) return null

    let bestMatch = null
    let maxScore = 0

    // Simple keyword matching score
    for (const book of this.books) {
      for (const section of book.sections) {
        let score = 0
        const contentLower = section.content.toLowerCase()

        for (const kw of keywords) {
          if (contentLower.includes(kw)) {
            score++
          }
        }

        if (score > maxScore) {
          maxScore = score
          bestMatch = {
            content: section.content,
            title: book.title,
            section: section.name
          }
        }
      }
    }

    if (bestMatch && maxScore > 0) {
      return `[From: ${bestMatch.title} - ${bestMatch.section}]\n${bestMatch.content}`
    }

    return null
  }
}

export const bookSearchService = new BookSearchService()
