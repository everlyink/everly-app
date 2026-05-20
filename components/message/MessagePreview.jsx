import { formatDeliveryDate } from '@/lib/format';
import { themeClass } from '@/lib/plans';

export default function MessagePreview({ senderFirstName, recipientName, body, deliverAt, writtenAt, theme = 'forest' }) {
  const writtenDate = writtenAt ? formatDeliveryDate(writtenAt) : formatDeliveryDate(new Date());
  return (
    <div className={`preview ${themeClass(theme)}`}>
      <p className="preview-from">a message from {senderFirstName || 'someone'}</p>
      <h2 className="preview-greeting">dear {recipientName || '...'},</h2>
      <p className="preview-date">{deliverAt ? formatDeliveryDate(deliverAt) : 'pick a date to schedule'}</p>
      <div className="preview-divider" />
      <div className="preview-body">{body || 'your words will appear here, just as they will arrive.'}</div>
      <p className="preview-footer">written {writtenDate} · delivered by everly</p>
    </div>
  );
}
