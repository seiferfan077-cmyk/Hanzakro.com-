import { Link } from 'react-router-dom';

type DashboardLinkCardProps = {
  to: string;
  number: string;
  title: string;
  description: string;
  status: string;
};

function DashboardLinkCard({ to, number, title, description, status }: DashboardLinkCardProps) {
  return (
    <Link className="dashboard-link-card" to={to}>
      <div className="dashboard-card-topline">
        <span className="dashboard-card-number">{number}</span>
        <span className="dashboard-card-status">{status}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="dashboard-card-open">
        فتح القسم <span className="dashboard-card-arrow" aria-hidden="true">←</span>
      </span>
    </Link>
  );
}

export default DashboardLinkCard;
