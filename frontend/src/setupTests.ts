const origConsoleWarn = console.warn;
const origConsoleError = console.error;

const WARN_FILTERS = [
  /Not implemented.*getComputedStyle.*pseudo/i,
  /Could not parse CSS stylesheet/i,
];

function shouldFilter(args: unknown[]): boolean {
  const msg = args[0];
  if (!msg) return false;
  const s = String(msg);
  return WARN_FILTERS.some((r) => r.test(s));
}

console.warn = (...args: unknown[]) => {
  if (shouldFilter(args)) return;
  origConsoleWarn.apply(console, args);
};

console.error = (...args: unknown[]) => {
  if (shouldFilter(args)) return;
  origConsoleError.apply(console, args);
};

const origGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (element, pseudoElt) => {
  if (pseudoElt) {
    return new Proxy({}, {
      get() {
        return "";
      },
    });
  }
  return origGetComputedStyle.call(window, element);
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
