import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Receive } from "../components/user/Receive.tsx";
import { Send } from "../components/user/Send.tsx";
import { tabButtonClassName, tabListClassName } from "../lib/tabStyles";
import { parseFundPageSearchParams } from "../lib/fundLinks";

export function TransferFundsPage() {
  const [searchParams] = useSearchParams();
  const { tab, recipient } = useMemo(
    () => parseFundPageSearchParams(searchParams.toString()),
    [searchParams],
  );
  const [selectedIndex, setSelectedIndex] = useState(tab === "send" ? 1 : 0);

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Manage Funds" }]}
        className="mb-3"
      />

      <div className="space-y-4">
        <div className="rounded-sm border border-gray-200">
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
                  <Send
                    initialRecipientAddress={recipient ?? undefined}
                    lockRecipient={Boolean(recipient)}
                  />
                </div>
              </TabPanel>
            </div>
          </TabGroup>
        </div>
      </div>
    </>
  );
}
