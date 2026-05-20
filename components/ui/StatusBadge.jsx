export default function StatusBadge({ status }) {
  const map = {
    scheduled: { className: 'badge badge-scheduled', label: 'scheduled' },
    delivered: { className: 'badge badge-delivered', label: 'delivered' },
    draft: { className: 'badge badge-draft', label: 'draft' },
    cancelled: { className: 'badge badge-cancelled', label: 'cancelled' },
  };
  const entry = map[status] || map.draft;
  return <span className={entry.className}>{entry.label}</span>;
}
