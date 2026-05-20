// formatting helpers — everything in plain lowercase warm style

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export function formatDeliveryDate(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function toInputDate(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function fromInputDate(value) {
  if (!value) return null;
  // interpret as local midday to avoid timezone-shift surprises
  return new Date(`${value}T12:00:00`);
}

export function preview(text, max = 80) {
  if (!text) return '';
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + '…';
}
