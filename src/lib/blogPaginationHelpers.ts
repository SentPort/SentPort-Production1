export const PAGE_BREAK_MARKER = '---PAGE_BREAK---';
export const AUTO_PAGINATE_THRESHOLD = 5000;
export const TOC_THRESHOLD = 1500;

export interface PageContent {
  pageNumber: number;
  content: string;
  startPosition: number;
  endPosition: number;
}

export function parsePageBreaks(content: string): number[] {
  const breaks: number[] = [];
  let currentIndex = 0;

  while (true) {
    const index = content.indexOf(PAGE_BREAK_MARKER, currentIndex);
    if (index === -1) break;
    breaks.push(index);
    currentIndex = index + PAGE_BREAK_MARKER.length;
  }

  return breaks;
}

export function removePageBreakMarkers(content: string): string {
  return content.replaceAll(PAGE_BREAK_MARKER, '');
}

export function splitContentIntoPages(
  content: string,
  pageBreaks: number[]
): PageContent[] {
  if (!pageBreaks || pageBreaks.length === 0) {
    return [{
      pageNumber: 1,
      content: removePageBreakMarkers(content),
      startPosition: 0,
      endPosition: content.length
    }];
  }

  const pages: PageContent[] = [];
  const cleanContent = removePageBreakMarkers(content);

  let adjustedBreaks = [...pageBreaks].sort((a, b) => a - b);

  for (let i = 0; i <= adjustedBreaks.length; i++) {
    const start = i === 0 ? 0 : adjustedBreaks[i - 1];
    const end = i === adjustedBreaks.length ? content.length : adjustedBreaks[i];

    const markersBefore = i;
    const adjustedStart = start - (markersBefore * PAGE_BREAK_MARKER.length);
    const adjustedEnd = end - (markersBefore * PAGE_BREAK_MARKER.length);

    const pageContent = cleanContent.substring(adjustedStart, adjustedEnd).trim();

    if (pageContent) {
      pages.push({
        pageNumber: i + 1,
        content: pageContent,
        startPosition: adjustedStart,
        endPosition: adjustedEnd
      });
    }
  }

  return pages;
}

export function extractHeadings(content: string): { text: string; level: number; id: string }[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: { text: string; level: number; id: string }[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    headings.push({ text, level, id });
  }

  return headings;
}

export function shouldShowTableOfContents(wordCount: number): boolean {
  return wordCount >= TOC_THRESHOLD;
}

export function shouldAutoPaginate(wordCount: number, autoPaginateEnabled: boolean): boolean {
  return autoPaginateEnabled && wordCount >= AUTO_PAGINATE_THRESHOLD;
}

export function calculateReadingProgress(
  currentPage: number,
  scrollPercent: number,
  totalPages: number
): number {
  if (totalPages === 1) {
    return scrollPercent;
  }

  const pageWeight = 100 / totalPages;
  const completedPages = (currentPage - 1) * pageWeight;
  const currentPageProgress = (scrollPercent / 100) * pageWeight;

  return Math.min(100, completedPages + currentPageProgress);
}
