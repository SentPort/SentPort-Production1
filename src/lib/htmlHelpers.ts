export function stripHtmlTags(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function getWordCount(html: string): number {
  const text = stripHtmlTags(html);
  const words = text.trim().split(/\s+/);
  return words.filter(word => word.length > 0).length;
}

export function getExcerpt(html: string, maxLength: number = 150): string {
  const text = stripHtmlTags(html);
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength).trim() + '...';
}

export function sanitizeHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const scripts = tmp.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  const eventAttributes = tmp.querySelectorAll('[onclick], [onload], [onerror], [onmouseover]');
  eventAttributes.forEach(el => {
    el.removeAttribute('onclick');
    el.removeAttribute('onload');
    el.removeAttribute('onerror');
    el.removeAttribute('onmouseover');
  });

  return tmp.innerHTML;
}

export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export function markdownToHtml(markdown: string): string {
  let html = markdown;

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

export function parsePageBreaksFromHtml(html: string): number[] {
  const breaks: number[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const pageBreaks = doc.querySelectorAll('[data-page-break]');

  if (pageBreaks.length === 0) {
    return [];
  }

  let position = 0;
  const body = doc.body;

  Array.from(body.childNodes).forEach((node) => {
    if (node instanceof HTMLElement && node.hasAttribute('data-page-break')) {
      breaks.push(position);
    } else {
      const div = document.createElement('div');
      div.appendChild(node.cloneNode(true));
      position += div.innerHTML.length;
    }
  });

  return breaks;
}
