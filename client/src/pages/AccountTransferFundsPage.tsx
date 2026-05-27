import { useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Receive } from "../components/user/Receive.tsx";
import { Send } from "../components/user/Send.tsx";
import { tabButtonClassName, tabListClassName } from "../lib/tabStyles";

export function TransferFundsPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Manage" }]}
        className="mb-3"
      />

      <div className="space-y-4">
        <div className="rounded-sm border border-gray-200 bg-white shadow">
          <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
            <TabList className={tabListClassName("space-x-1", "px-4", "pt-2")}>
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Deposit
              </Tab>
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Send
              </Tab>
            </TabList>
            <div className="px-4 py-2">
              <TabPanel>
                <div className="py-2">
                  <Receive />
                </div>
              </TabPanel>
              <TabPanel>
                <div className="py-2">
                  <Send />
                </div>
              </TabPanel>
            </div>
          </TabGroup>
        </div>
      </div>
    </div>
  );
}
