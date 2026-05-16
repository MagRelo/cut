import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  cn,
  segmentButtonClassName,
  tabButtonClassName,
  tabListClassName,
} from "../lib/tabStyles";

const ROUND_OPTIONS = [1, 2, 3, 4] as const;

function TabRowDemo() {
  const [selected, setSelected] = useState<"lineups" | "predictions" | "results">("lineups");
  const tabs = [
    { id: "lineups" as const, label: "Lineups" },
    { id: "predictions" as const, label: "Predictions" },
    { id: "results" as const, label: "Results" },
  ];

  return (
    <div className="w-full max-w-md">
      <div className={tabListClassName()} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected === tab.id}
            className={tabButtonClassName(selected === tab.id)}
            onClick={() => setSelected(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-gray-600">Active tab: {selected}</p>
    </div>
  );
}

function SegmentRowDemo() {
  const [round, setRound] = useState<(typeof ROUND_OPTIONS)[number]>(1);

  return (
    <div className="w-full max-w-md">
      <div className="flex" role="tablist" aria-label="Round">
        {ROUND_OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={round === r}
            className={segmentButtonClassName(round === r)}
            onClick={() => setRound(r)}
          >
            R{r}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-gray-600">Selected round: {round}</p>
    </div>
  );
}

function CompactTabsDemo() {
  const [selected, setSelected] = useState(0);
  const labels = ["All", "Mine"];

  return (
    <div className="w-full max-w-xs">
      <div className={cn(tabListClassName(), "gap-0")}>
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            className={tabButtonClassName(selected === index, { compact: true })}
            onClick={() => setSelected(index)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: "Patterns/Segment tabs",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullWidthTabs: Story = {
  render: () => <TabRowDemo />,
};

export const RoundSegments: Story = {
  render: () => <SegmentRowDemo />,
};

export const CompactTabs: Story = {
  render: () => <CompactTabsDemo />,
};
