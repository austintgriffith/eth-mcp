/**
 * SwapUI Component
 * React component for swapping tokens with tax visualization
 *
 * DESIGN SYSTEM: This component follows the eth-mcp Frontend Design Guide
 * - Uses DaisyUI theme tokens only (no custom colors)
 * - Recommended theme: "corporate" for DeFi/Finance apps
 * - No gradients, no glassmorphism, no large shadows
 * - Shadows limited to shadow-md max
 * - References: Uniswap app (not marketing), Etherscan styling
 *
 * PLACEHOLDER - This shows the structure for a swap UI
 * Full implementation requires:
 * - wagmi hooks for wallet connection
 * - Uniswap V4 SDK integration
 * - Price quote fetching
 * - Transaction execution
 */

import React, { useState, useEffect } from "react";
// These imports would come from scaffold-eth-2
// import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
// import { useAccount } from "wagmi";

interface SwapUIProps {
  taxTokenAddress: string;
  poolAddress: string;
}

/**
 * Token input component
 */
const TokenInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  token: string;
  disabled?: boolean;
}> = ({ label, value, onChange, token, disabled }) => (
  <div className="bg-base-200 rounded-lg p-4 mb-2 border border-base-300">
    <div className="text-sm text-base-content/60 mb-1">{label}</div>
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input input-ghost text-2xl font-bold flex-1 p-0"
        placeholder="0.0"
      />
      <div className="badge badge-lg">{token}</div>
    </div>
  </div>
);

/**
 * Tax breakdown display
 */
const TaxBreakdown: React.FC<{
  inputAmount: string;
  taxRate: number;
}> = ({ inputAmount, taxRate }) => {
  const amount = parseFloat(inputAmount) || 0;
  const taxAmount = amount * (taxRate / 100);
  const netAmount = amount - taxAmount;

  if (amount === 0) return null;

  return (
    <div className="bg-warning/10 border border-warning rounded-lg p-3 mb-4">
      <div className="text-sm font-semibold mb-2">Tax Breakdown (1%)</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>Input Amount:</div>
        <div className="text-right">{amount.toFixed(4)} TAX</div>
        <div>Tax ({taxRate}%):</div>
        <div className="text-right text-warning">-{taxAmount.toFixed(4)} TAX</div>
        <div className="font-semibold">Net Swap:</div>
        <div className="text-right font-semibold">{netAmount.toFixed(4)} TAX</div>
      </div>
    </div>
  );
};

/**
 * Main SwapUI component
 */
export const SwapUI: React.FC<SwapUIProps> = ({
  taxTokenAddress,
  poolAddress,
}) => {
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [swapDirection, setSwapDirection] = useState<"taxToEth" | "ethToTax">("taxToEth");

  const TAX_RATE = 1; // 1%

  // Placeholder for actual wagmi hook
  // const { address } = useAccount();

  // Calculate output amount (placeholder - would use actual price feed)
  useEffect(() => {
    if (!inputAmount) {
      setOutputAmount("");
      return;
    }

    const input = parseFloat(inputAmount);
    if (isNaN(input)) return;

    // Placeholder calculation
    // In reality: fetch quote from V4 quoter contract
    const taxDeduction = swapDirection === "taxToEth" ? input * (TAX_RATE / 100) : 0;
    const netInput = input - taxDeduction;
    const mockExchangeRate = 0.001; // Placeholder rate

    const output = swapDirection === "taxToEth"
      ? netInput * mockExchangeRate
      : input / mockExchangeRate;

    setOutputAmount(output.toFixed(6));
  }, [inputAmount, swapDirection]);

  // Swap direction toggle
  const toggleDirection = () => {
    setSwapDirection((d) => (d === "taxToEth" ? "ethToTax" : "taxToEth"));
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  // Execute swap (placeholder)
  const executeSwap = async () => {
    setIsLoading(true);
    try {
      // In reality:
      // 1. Check allowance, approve if needed
      // 2. Build swap transaction using V4 router
      // 3. Execute and wait for confirmation

      console.log("Executing swap:", {
        direction: swapDirection,
        inputAmount,
        outputAmount,
      });

      // Simulate delay
      await new Promise((r) => setTimeout(r, 2000));

      alert("Swap executed! (placeholder)");
    } catch (error) {
      console.error("Swap failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const inputToken = swapDirection === "taxToEth" ? "TAX" : "ETH";
  const outputToken = swapDirection === "taxToEth" ? "ETH" : "TAX";

  return (
    <div className="card bg-base-100 shadow-md border border-base-300 max-w-md mx-auto">
      <div className="card-body">
        <h2 className="card-title justify-center mb-4">
          Swap Tokens
        </h2>

        {/* Input */}
        <TokenInput
          label="You Pay"
          value={inputAmount}
          onChange={setInputAmount}
          token={inputToken}
        />

        {/* Swap direction button - simple, no emoji */}
        <div className="flex justify-center -my-2 z-10">
          <button
            onClick={toggleDirection}
            className="btn btn-circle btn-sm btn-outline"
            aria-label="Switch swap direction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Output */}
        <TokenInput
          label="You Receive"
          value={outputAmount}
          onChange={() => {}}
          token={outputToken}
          disabled
        />

        {/* Tax breakdown (only when selling tax token) */}
        {swapDirection === "taxToEth" && (
          <TaxBreakdown inputAmount={inputAmount} taxRate={TAX_RATE} />
        )}

        {/* Swap button */}
        <button
          onClick={executeSwap}
          disabled={!inputAmount || isLoading}
          className={`btn btn-primary w-full ${isLoading ? "loading" : ""}`}
        >
          {isLoading ? "Swapping..." : "Swap"}
        </button>

        {/* Info - uses theme token for muted text */}
        <div className="text-xs text-base-content/50 text-center mt-2">
          <p>1% tax on TAX token sales</p>
          <p>Tax goes to protocol treasury</p>
        </div>
      </div>
    </div>
  );
};

export default SwapUI;
