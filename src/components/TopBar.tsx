type Props = {
  title: string;
  subtitle?: string;
  onReset: () => void;
};

export function TopBar({ title, subtitle, onReset }: Props) {
  return (
    <header className="top-bar">
      <div className="top-left">
        <h1 className="top-title">{title}</h1>
        {subtitle && <span className="top-subtitle">{subtitle}</span>}
      </div>
      <div className="top-right">
        <button className="ghost-btn" onClick={onReset}>
          回到起点
        </button>
      </div>
    </header>
  );
}
