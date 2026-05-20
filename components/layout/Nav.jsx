import Link from 'next/link';
import { useState } from 'react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function Nav({ showCompose = true }) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="nav" aria-label="primary">
      <Logo href="https://everly.ink" />
      <div className="nav-actions">
        {profile?.first_name && <span className="nav-user">hello, {profile.first_name}</span>}
        <div className="menu">
          <button
            className="icon-btn"
            onClick={() => setMenuOpen((s) => !s)}
            aria-label="menu"
            aria-expanded={menuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <div className="menu-popover" onMouseLeave={() => setMenuOpen(false)}>
              <Link href="/dashboard" className="menu-item" onClick={() => setMenuOpen(false)}>
                your word clock
              </Link>
              <Link href="/settings" className="menu-item" onClick={() => setMenuOpen(false)}>
                settings
              </Link>
              <Link href="/upgrade" className="menu-item" onClick={() => setMenuOpen(false)}>
                upgrade
              </Link>
              <button
                type="button"
                className="menu-item menu-item-danger"
                onClick={async () => {
                  setMenuOpen(false);
                  await signOut();
                  window.location.href = '/login';
                }}
              >
                sign out
              </button>
            </div>
          )}
        </div>
        {showCompose && (
          <Button href="/compose" size="small">
            write a message
          </Button>
        )}
      </div>
    </nav>
  );
}
