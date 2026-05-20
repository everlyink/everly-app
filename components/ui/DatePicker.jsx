import { useMemo, useState } from 'react';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const DAY_LABELS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const weekday = (first.getDay() + 6) % 7; // monday-first
  const start = new Date(year, month, 1 - weekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function DatePicker({ value, onChange, minDate, maxDate }) {
  const initial = value || minDate || new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const grid = useMemo(() => buildMonthGrid(view.year, view.month), [view]);
  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : null;

  const yearRange = useMemo(() => {
    const startYear = min ? min.getFullYear() : new Date().getFullYear();
    const endYear = max ? max.getFullYear() : startYear + 10;
    const years = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);
    // include the current view year even if outside (defensive)
    if (!years.includes(view.year)) years.push(view.year);
    return years.sort((a, b) => a - b);
  }, [min, max, view.year]);

  function shift(months) {
    setView((v) => {
      const d = new Date(v.year, v.month + months, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function setMonth(m) {
    setView((v) => ({ ...v, month: parseInt(m, 10) }));
  }

  function setYear(y) {
    setView((v) => ({ ...v, year: parseInt(y, 10) }));
  }

  function isDisabled(d) {
    const s = startOfDay(d);
    if (min && s < min) return true;
    if (max && s > max) return true;
    return false;
  }

  function isMonthDisabled(year, month) {
    // a month is disabled if every day in it falls outside [min, max]
    if (!min && !max) return false;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); // last day of month
    if (min && monthEnd < startOfDay(min)) return true;
    if (max && monthStart > startOfDay(max)) return true;
    return false;
  }

  function canShiftBack() {
    if (!min) return true;
    const prevMonthEnd = new Date(view.year, view.month, 0);
    return prevMonthEnd >= min;
  }

  function canShiftForward() {
    if (!max) return true;
    const nextMonthStart = new Date(view.year, view.month + 1, 1);
    return nextMonthStart <= max;
  }

  return (
    <div className="datepicker" role="group" aria-label="select delivery date">
      <div className="datepicker-header">
        <button
          type="button"
          className="datepicker-nav"
          onClick={() => shift(-1)}
          disabled={!canShiftBack()}
          aria-label="previous month"
        >
          ‹
        </button>
        <div className="datepicker-selectors">
          <select
            className="datepicker-select"
            value={view.month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="month"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i} disabled={isMonthDisabled(view.year, i)}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="datepicker-select"
            value={view.year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="year"
          >
            {yearRange.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="datepicker-nav"
          onClick={() => shift(1)}
          disabled={!canShiftForward()}
          aria-label="next month"
        >
          ›
        </button>
      </div>

      <div className="datepicker-grid" role="grid">
        {DAY_LABELS.map((d) => (
          <div key={d} className="datepicker-day-label">
            {d}
          </div>
        ))}
        {(() => {
          // mark the first selectable day so we can pulse it on the very first render
          // (gives a gentle visual hint that the calendar wants a tap)
          let firstSelectableIndex = -1;
          if (!value) {
            for (let i = 0; i < grid.length; i++) {
              const d = grid[i];
              if (d.getMonth() === view.month && !isDisabled(d)) {
                firstSelectableIndex = i;
                break;
              }
            }
          }
          return grid.map((d, i) => {
            const otherMonth = d.getMonth() !== view.month;
            const disabled = isDisabled(d);
            const selected = value && sameDay(d, value);
            const pulse = i === firstSelectableIndex;
            const classes = [
              'datepicker-day',
              otherMonth ? 'datepicker-day-other-month' : '',
              disabled ? 'datepicker-day-disabled' : '',
              selected ? 'datepicker-day-selected' : '',
              pulse ? 'datepicker-day-pulse' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={i}
                type="button"
                className={classes}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  const next = new Date(d);
                  if (value) {
                    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                  } else {
                    next.setHours(0, 0, 0, 0);
                  }
                  onChange?.(next);
                  if (otherMonth) setView({ year: d.getFullYear(), month: d.getMonth() });
                }}
                aria-pressed={selected}
                aria-label={d.toDateString()}
              >
                {d.getDate()}
              </button>
            );
          });
        })()}
      </div>
    </div>
  );
}
