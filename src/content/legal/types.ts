export type LegalSection = { id: string; heading: string; paragraphs?: string[]; bullets?: string[] };

export type LegalDoc = { title: string; updated: string; summary: string; sections: LegalSection[] };

/** One legal document in both site languages. Both versions must use the same section ids, in the same order. */
export type LegalContent = { en: LegalDoc; ar: LegalDoc };
