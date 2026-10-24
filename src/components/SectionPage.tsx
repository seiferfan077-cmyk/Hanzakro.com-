import { Link } from 'react-router-dom';

type SectionPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  nextStep: string;
};

function SectionPage({ eyebrow, title, description, nextStep }: SectionPageProps) {
  return (
    <section className="section-page" aria-labelledby="section-title">
      <p className="eyebrow"><span className="status-dot" /> {eyebrow}</p>
      <h1 id="section-title" className="section-page-title">{title}</h1>
      <p className="section-page-description">{description}</p>

      <div className="section-state" role="status">
        <span className="section-state-icon" aria-hidden="true">✳</span>
        <div>
          <p className="section-state-title">هذا القسم في مرحلة التجهيز</p>
          <p className="section-state-copy">{nextStep}</p>
        </div>
      </div>

      <Link className="button button-primary" to="/">
        العودة إلى الرئيسية <span aria-hidden="true">←</span>
      </Link>
    </section>
  );
}

export default SectionPage;
