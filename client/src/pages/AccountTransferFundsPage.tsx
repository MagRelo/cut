import { useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Receive } from "../components/user/Receive.tsx";
import { Send } from "../components/user/Send.tsx";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function TransferFundsPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Manage" }]}
        className="mb-3"
      />

      <div className="space-y-4">
        <div className="bg-white rounded-sm shadow border border-gray-200">
          <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
            <TabList className="flex space-x-1 border-b border-gray-200 px-4">
              <Tab
                className={({ selected }: { selected: boolean }) =>
                  classNames(
                    "w-full py-2 text-sm font-display leading-5",
                    "focus:outline-none",
                    selected
                      ? "border-b-2 border-blue-600 text-blue-700"
                      : "text-gray-600 hover:text-gray-800",
                  )
                }
              >
                Deposit
              </Tab>
              <Tab
                className={({ selected }: { selected: boolean }) =>
                  classNames(
                    "w-full py-2 text-sm font-display leading-5",
                    "focus:outline-none",
                    selected
                      ? "border-b-2 border-blue-600 text-blue-700"
                      : "text-gray-600 hover:text-gray-800",
                  )
                }
              >
                Withdraw
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
