/** True when admin (or legacy data) stored HTML tags in the description field. */
export function looksLikeHtml(text) {
  if (!text || typeof text !== 'string') return false;
  return /<\/?[a-z][\s\S]*?>/i.test(text.trim());
}

/**
 * Renders product description preserving line breaks from admin textarea input.
 * Plain text uses pre-wrap; legacy HTML descriptions still render as markup.
 */
export default function ProductDescriptionContent({ text, className = 'pd-description' }) {
  if (!text?.trim()) return null;

  if (looksLikeHtml(text)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: text }} />;
  }

  return <div className={`${className} whitespace-pre-wrap`}>{text}</div>;
}
