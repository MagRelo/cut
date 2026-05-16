import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Modal } from "./Modal";

const meta = {
  title: "Common/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    isOpen: true,
    onClose: fn(),
    title: "Contest payouts",
    children: (
      <div className="p-4 font-display text-sm leading-relaxed text-gray-700">
        <p>Primary pool pays top 3 lineups. Secondary market settles after the final round.</p>
      </div>
    ),
    maxWidth: "2xl",
    showCloseButton: true,
    hideHeader: false,
    scrollable: false,
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Wide: Story = {
  args: {
    maxWidth: "4xl",
    title: "Select players",
    children: (
      <div className="grid min-h-[12rem] place-items-center p-8 text-sm text-gray-500">
        Wide modal content area
      </div>
    ),
  },
};

export const ScrollableBody: Story = {
  args: {
    scrollable: true,
    maxHeight: "16rem",
    children: (
      <div className="space-y-3 p-4 text-sm text-gray-700">
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i}>Scrollable row {i + 1}</p>
        ))}
      </div>
    ),
  },
};

export const HiddenHeader: Story = {
  args: {
    hideHeader: true,
    title: "Player details",
    children: <div className="p-6 text-center text-sm text-gray-600">Header hidden; title kept for screen readers.</div>,
  },
};

/** Toggle open/close like in the app (controlled state). */
export const Interactive: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-4">
        <button
          type="button"
          className="rounded-sm bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          onClick={() => setOpen(true)}
        >
          Open modal
        </button>
        <Modal {...args} isOpen={open} onClose={() => setOpen(false)} />
      </div>
    );
  },
  args: {
    isOpen: false,
    title: "Join contest",
    children: <p className="p-4 text-sm text-gray-700">Confirm your lineup before the lock time.</p>,
  },
};
