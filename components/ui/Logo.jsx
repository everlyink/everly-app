import Link from 'next/link';

export default function Logo({ href = '/', size }) {
  const style = size ? { fontSize: size } : undefined;
  const content = (
    <span className="logo" style={style}>
      everly<span className="logo-cursor" aria-hidden="true">|</span>
    </span>
  );
  if (!href) return content;
  return (
    <Link href={href} aria-label="everly home" style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  );
}
