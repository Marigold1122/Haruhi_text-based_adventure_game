export type NarrativeClock = {
  id: string;
  label: string;
  value: number;
  max: number;
  direction: "up" | "down";
  visibleToPlayer: boolean;
  tags: string[];
  onFilledStoryletIds: string[];
};

export type ClockTick = {
  id: string;
  delta: number;
  reason?: string;
};
