import Icon from './Icon';

export default function KPIStat({
  icon,
  title,
  value,
  description,
  trend,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
  trend?: string;
}) {
  const toneMap: Record<string, string> = {
    'Total Reports': 'blue',
    'Verified Reports': 'green',
    'Needs Verification': 'amber',
    'Active Events': 'red',
  };

  const tone = toneMap[title] || 'blue';

  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon"><Icon name={icon} /></span>
        <span className="trend">{trend || ''}</span>
      </div>

      <p>{title}</p>

      <strong>{value}</strong>

      <small>{description}</small>
    </div>
  );
}
