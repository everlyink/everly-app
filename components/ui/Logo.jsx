import Link from 'next/link';

export default function Logo({ href = '/', size }) {
  const style = size ? { fontSize: size } : undefined;
  const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href);

  const content = (
    <span className="logo" style={style}>
      everly<span className="logo-cursor" aria-hidden="true">|</span>
    </span>
  );

  if (!href) return content;

  if (isExternal) {
    return (
      <a href={href} aria-label="everly home" className="logo-link">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} aria-label="everly home" className="logo-link">
      {content}
    </Link>
  );
}
