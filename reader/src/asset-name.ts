/** Markdown images must be a single local filename, even after URL decoding. */
export function imageName(url: string): string | undefined {
  try {
    const name = decodeURIComponent(url.split(/[?#]/, 1)[0]);
    return name && !name.startsWith('.') && !/[\\/:\0]/.test(name) ? name : undefined;
  } catch { return undefined; }
}
