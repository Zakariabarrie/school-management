import { useApp } from '../state/store';

export function Logo({ size = 40, light = false }: { size?: number; light?: boolean }) {
  const { settings } = useApp();
  if (settings.logo) {
    return <img className="school-logo" src={settings.logo} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  const shield = light ? 'var(--on-menu)' : 'var(--navy)';
  const inner = light ? 'var(--navy)' : 'var(--card)';
  const book = light ? 'var(--menu-accent)' : 'var(--blue)';
  return (
    <svg className="school-crest" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 3 42 10v14c0 10.5-7.4 17.8-18 21C13.4 41.8 6 34.5 6 24V10L24 3z" fill={shield} />
      <path d="M24 8.2 36.5 13v11.2c0 7.6-5.2 13-12.5 15.4C16.7 37.2 11.5 31.8 11.5 24.2V13L24 8.2z" fill={inner} />
      <path d="M17 29.2c2.2-1.8 4.4-2.7 7-2.7s4.8.9 7 2.7" fill="none" stroke="var(--teal)" strokeWidth="1.6" />
      <path d="M18 20h12v7.4c0 1.5-4 3.2-6 3.2s-6-1.7-6-3.2V20z" fill={book} />
      <path d="M24 20v10.6" stroke={inner} strokeWidth="1.2" />
    </svg>
  );
}