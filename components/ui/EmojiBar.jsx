// warm character toolbar above the message textarea.
// desktop only — hidden under 768px to keep mobile composition uncluttered.

const ITEMS = [
  '🌿', '✦', '🌸', '💌', '🕊', '☁️', '🌙', '✉️',
  '( ´ ▽ ` )', '♡', '(◕‿◕)', '☆', '🌱', '💛', '༺♡༻',
];

export default function EmojiBar({ onInsert }) {
  return (
    <div className="emoji-bar" role="toolbar" aria-label="insert a warm character">
      {ITEMS.map((ch) => (
        <button
          key={ch}
          type="button"
          className="emoji-bar-btn"
          onClick={() => onInsert(ch)}
          aria-label={`insert ${ch}`}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
