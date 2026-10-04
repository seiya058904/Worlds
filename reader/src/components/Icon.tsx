type IconName = 'search' | 'back' | 'next' | 'chevron' | 'panel' | 'close' | 'plus' | 'minus' | 'expand' | 'map';
const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="10.8" cy="10.8" r="7.2" /><path d="m16.2 16.2 4.3 4.3" /></>,
  back: <path d="m14 4-8 8 8 8" />,
  next: <path d="m9 5 7 7-7 7" />,
  chevron: <path d="m7 9 5 5 5-5" />,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 4v16" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6" />,
  map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z" /><path d="M9 3v16M15 5v16" /></>,
};
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
