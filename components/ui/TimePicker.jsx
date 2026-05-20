// optional time picker. value is a Date (combined with the picked date in the parent).
// hours: 0-23 · minutes: 15-min increments (00, 15, 30, 45).
// passing null/undefined keeps it "unset" — the parent will fall back to a default.

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function TimePicker({ hour, minute, enabled, onChange, onToggle }) {
  return (
    <div className="timepicker">
      <label className="timepicker-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle?.(e.target.checked)}
        />
        <span>add a specific time</span>
      </label>

      {enabled && (
        <div className="timepicker-row" role="group" aria-label="time of day">
          <select
            className="datepicker-select"
            value={hour ?? 9}
            onChange={(e) => onChange?.({ hour: parseInt(e.target.value, 10), minute: minute ?? 0 })}
            aria-label="hour"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span className="timepicker-colon">:</span>
          <select
            className="datepicker-select"
            value={minute ?? 0}
            onChange={(e) => onChange?.({ hour: hour ?? 9, minute: parseInt(e.target.value, 10) })}
            aria-label="minute"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span className="timepicker-hint">24-hour</span>
        </div>
      )}

      {!enabled && (
        <span className="field-hint">will arrive in the morning of the chosen day.</span>
      )}
    </div>
  );
}
