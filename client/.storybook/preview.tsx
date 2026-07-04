import type { Preview } from "@storybook/react-vite";
import "../src/index.css";
import { withAppProviders } from "./decorators";
import { withSideBetStoryMocks } from "./decorators/withSideBetStoryMocks";
import { installStorybookSideBetFetchMock } from "./mocks/storybookSideBetFetch";

installStorybookSideBetFetchMock();

const preview: Preview = {
  decorators: [
    withSideBetStoryMocks(),
    withAppProviders,
    (Story) => (
      <div className="min-h-screen bg-gray-100 p-6 font-sans text-gray-900">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "#f3f4f6" },
        { name: "white", value: "#ffffff" },
      ],
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
