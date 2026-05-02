import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  onReset: () => void;
  actions?: ReactNode;
};

export function TopBar({ title, subtitle, onReset, actions }: Props) {
  return (
    <header className="top-bar">
      <div className="top-left">
        <h1 className="top-title">{title}</h1>
        {subtitle && <span className="top-subtitle">{subtitle}</span>}
      </div>
      <div className="top-right">
        {actions}
        <button className="ghost-btn" onClick={onReset}>回到起点</button>
      </div>
    </header>
  );
}
