/** Reset window/document scroll (SPA route changes, after scroll-lock unlock). */
export function scrollToTop() {
  window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
