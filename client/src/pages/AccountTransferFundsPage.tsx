import { useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Link } from "react-router-dom";
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
        items={[{ label: "Account", path: "/account" }, { label: "Transfer funds" }]}
        className="mb-3"
      />

      <div className="space-y-4">
        <div className="bg-white rounded-sm shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Transfer funds</h2>
          <div className="text-sm text-gray-700 space-y-3">
            <p>
              You can fund your account by sending USDC on the Base network to your Account ID.
            </p>
            <p>
              Your <strong>Account ID</strong> is your wallet address on Base (
              <code className="font-mono text-xs bg-gray-100 px-1 rounded">0x…</code>), also shown on
              your{" "}
              <Link to="/account" className="text-blue-600 hover:underline">
                Account
              </Link>{" "}
              page. Use <strong>Receive</strong> to share it; use <strong>Send</strong> and paste
              someone else&apos;s Account ID in <strong>Recipient Address</strong> to pay them.
            </p>
          </div>
        </div>

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
                      : "text-gray-600 hover:text-gray-800"
                  )
                }
              >
                Receive
              </Tab>
              <Tab
                className={({ selected }: { selected: boolean }) =>
                  classNames(
                    "w-full py-2 text-sm font-display leading-5",
                    "focus:outline-none",
                    selected
                      ? "border-b-2 border-blue-600 text-blue-700"
                      : "text-gray-600 hover:text-gray-800"
                  )
                }
              >
                Send
              </Tab>
            </TabList>
            <div className="p-4">
              <TabPanel>
                <Receive tokenName="USDC" />
              </TabPanel>
              <TabPanel>
                <Send tokenName="USDC" />
              </TabPanel>
            </div>
          </TabGroup>
        </div>
      </div>
    </div>
  );
}
