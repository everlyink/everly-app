import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDeliveryDate, preview } from '@/lib/format';
import { canEditMessage, canCancelMessage, isPaid } from '@/lib/plans';

export default function MessageCard({ message, profile, onDuplicate, onCancel }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const editable = canEditMessage(message, profile);
  const cancellable = canCancelMessage(message, profile);
  const paid = profile && isPaid(profile.plan);

  const cancelled = message.status === 'cancelled';

  return (
    <article className={`message-card ${cancelled ? 'message-card-cancelled' : ''}`}>
      <header className="message-card-head">
        <div>
          <h3 className="message-card-recipient">{message.recipient_name}</h3>
          <div className="message-card-date">{formatDeliveryDate(message.deliver_at)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <StatusBadge status={message.status} />
          <div className="menu" ref={ref}>
            <button
              className="icon-btn"
              onClick={() => setOpen((s) => !s)}
              aria-label="message actions"
              aria-expanded={open}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="4" cy="10" r="1.5" fill="currentColor" />
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                <circle cx="16" cy="10" r="1.5" fill="currentColor" />
              </svg>
            </button>
            {open && (
              <div className="menu-popover">
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/message/${message.id}`);
                  }}
                >
                  view
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setOpen(false);
                    if (editable) {
                      router.push(`/message/${message.id}/edit`);
                    } else if (!paid) {
                      router.push('/upgrade');
                    } else {
                      router.push(`/message/${message.id}`);
                    }
                  }}
                  disabled={!editable && paid}
                >
                  edit{!paid ? ' · upgrade' : !editable ? ' · window closed' : ''}
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setOpen(false);
                    onDuplicate?.(message);
                  }}
                >
                  duplicate
                </button>
                <button
                  type="button"
                  className="menu-item menu-item-danger"
                  onClick={() => {
                    setOpen(false);
                    if (cancellable) onCancel?.(message);
                    else if (!paid) router.push('/upgrade');
                  }}
                  disabled={!cancellable && paid}
                >
                  cancel{!paid ? ' · upgrade' : !cancellable ? ' · too late' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <p className="message-card-preview">{preview(message.body, 80)}</p>
    </article>
  );
}
