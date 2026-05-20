import { THEMES } from '@/lib/plans';

export default function ThemePicker({ value, onChange, heading = '✦ choose a theme', subtitle }) {
  return (
    <section className="theme-picker" aria-labelledby="theme-picker-heading">
      <header className="theme-picker-head">
        <h3 id="theme-picker-heading" className="theme-picker-heading">
          {heading}
        </h3>
        <p className="theme-picker-sub">
          {subtitle || 'how should your message look when they read it?'}
        </p>
      </header>
      <div className="theme-grid" role="radiogroup" aria-label="message colour theme">
        {THEMES.map((t) => {
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`theme-swatch ${selected ? 'theme-swatch-selected' : ''}`}
              onClick={() => onChange?.(t.id)}
            >
              <span
                className="theme-swatch-chip"
                style={{ background: t.bg, color: t.text }}
                aria-hidden="true"
              >
                Aa
              </span>
              <span className="theme-swatch-name">{t.name}</span>
              {selected && (
                <span className="theme-swatch-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
