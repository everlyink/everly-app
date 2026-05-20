import Logo from '@/components/ui/Logo';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-left">
        <Logo href="https://everly.ink" />
      </div>
      <div className="footer-centre">
        © {year} everly · <a href="https://everly.ink">everly.ink</a>
      </div>
      <div className="footer-right">
        <a href="https://everly.ink/blog.html" className="footer-link">journal</a>
      </div>
    </footer>
  );
}
