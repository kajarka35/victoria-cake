// src/lib/actions/inView.ts
export function inView(
  node: HTMLElement,
  options: IntersectionObserverInit = { threshold: 0.1 }
) {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      node.dispatchEvent(new CustomEvent('inview'));
      observer.unobserve(node);
    }
  }, options);

  observer.observe(node);

  return {
    destroy() {
      observer.unobserve(node);
    }
  };
}
