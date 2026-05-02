import { useEffect, useState } from "react";

type Props = {
  active: boolean;
};

export function ThinkingTimer({ active }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }

    setSeconds(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);

    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;
  return <span className="thinking-timer">思考 {seconds} 秒</span>;
}
