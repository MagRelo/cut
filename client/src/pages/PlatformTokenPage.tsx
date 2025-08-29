import React, { useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { Buy } from "../components/user/Buy";
import { Sell } from "../components/user/Sell";
import { Transfer } from "../components/user/Transfer";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function PlatformTokenPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "CUT Tokens" }]}
        className="mb-3"
      />
      <PageHeader title="Manage CUT tokens" className="mb-3" />

      <div className="bg-white rounded-lg shadow">
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Buy
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Sell
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Transfer
            </Tab>
          </TabList>
          <div className="p-4">
            <TabPanel>
              <Buy />
            </TabPanel>
            <TabPanel>
              <Sell />
            </TabPanel>
            <TabPanel>
              <Transfer />
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
}
