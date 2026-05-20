import Nav from './Nav';
import Footer from './Footer';

export default function PageWrapper({ children, showCompose = true, planBar }) {
  return (
    <div className="page">
      <Nav showCompose={showCompose} />
      {planBar}
      <main className="page-main">{children}</main>
      <Footer />
    </div>
  );
}
