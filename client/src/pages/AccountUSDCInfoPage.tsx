// import { PageHeader } from "../components/common/PageHeader";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export function USDCInfoPage() {
  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "USDC" }]}
        className="mb-3"
      />
      {/* <PageHeader title="About USDC" className="mb-3" /> */}

      <div className="space-y-4">
        {/* What is USDC */}
        <div className="bg-white rounded-sm shadow p-6">
          <div className="flex items-center mb-4">
            <img src="/usd-coin-usdc-logo.svg" alt="USDC" className="w-12 h-12 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">What is USDC?</h2>
          </div>
          <div className="space-y-3 text-gray-700">
            <p>
              USD Coin (USDC) is a digital stablecoin that is pegged to the United States dollar.
              Each USDC token is backed by one dollar held in reserve, making it a stable and
              reliable digital currency for transactions.
            </p>
          </div>
        </div>

        {/* How to Get USDC */}
        <div className="bg-white rounded-sm shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How to Get USDC</h2>

          <div className="space-y-4">
            {/* Method 1: Exchanges */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                1. Buy on Crypto Exchanges
              </h3>
              <p className="text-gray-700 mb-2">
                Purchase USDC directly with your credit card, debit card, or bank transfer on major
                exchanges:
              </p>
              <ul className="space-y-1 ml-4 text-gray-600">
                <li>
                  <a
                    href="https://www.coinbase.com/how-to-buy/usd-coin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Coinbase ↗
                  </a>
                  {" - Beginner-friendly with easy USD purchases"}
                </li>
                <li>
                  <a
                    href="https://www.kraken.com/learn/buy-usd-coin-usdc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Kraken ↗
                  </a>
                  {" - Lower fees, good for larger amounts"}
                </li>
                <li>
                  <a
                    href="https://www.binance.us/buy-sell-crypto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Binance.US ↗
                  </a>
                  {" - Wide variety of payment options"}
                </li>
              </ul>
            </div>

            {/* Method 2: Crypto Wallets */}
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                2. Through Crypto Wallets
              </h3>
              <p className="text-gray-700 mb-2">
                Many crypto wallets allow you to buy USDC directly:
              </p>
              <ul className="space-y-1 ml-4 text-gray-600">
                <li>
                  <a
                    href="https://metamask.io/buy-crypto/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    MetaMask ↗
                  </a>
                  {" - Buy USDC directly in your wallet"}
                </li>
                <li>
                  <a
                    href="https://www.coinbase.com/wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Coinbase Wallet ↗
                  </a>
                  {" - Self-custody wallet with built-in purchase options"}
                </li>
              </ul>
            </div>

            {/* Method 3: Bridge from Other Chains */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                3. Bridge from Other Chains
              </h3>
              <p className="text-gray-700 mb-2">
                If you have USDC on another blockchain, you can bridge it to Base:
              </p>
              <ul className="space-y-1 ml-4 text-gray-600">
                <li>
                  <a
                    href="https://bridge.base.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Base Official Bridge ↗
                  </a>
                  {" - Official bridge for moving assets to Base"}
                </li>
                <li>
                  <a
                    href="https://app.uniswap.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Uniswap ↗
                  </a>
                  {" - Swap other tokens for USDC on Base"}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">⚠️ Important Notes</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Make sure you're using <strong>USDC on the Base network</strong>. Bet the Cut
                operates on Base (Layer 2).
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Always double-check the contract address when adding USDC to your wallet to avoid
                scams.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Keep some ETH in your wallet for transaction fees (gas) on Base.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Never share your private keys or seed phrase with anyone.</span>
            </li>
          </ul>
        </div>

        {/* Helpful Resources */}
        <div className="bg-white rounded-sm shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Helpful Resources</h2>
          <div className="space-y-2">
            <a
              href="https://www.circle.com/en/usdc"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              Official USDC Website by Circle ↗
            </a>
            <a
              href="https://docs.base.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              Base Network Documentation ↗
            </a>
            <a
              href="https://help.coinbase.com/en/coinbase/trading-and-funding/cryptocurrency-trading-pairs/usd-coin"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              Coinbase USDC Guide ↗
            </a>
            <a
              href="https://ethereum.org/en/stablecoins/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              Understanding Stablecoins (Ethereum.org) ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
