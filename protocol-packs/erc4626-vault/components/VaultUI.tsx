"use client";

/**
 * VaultUI Component
 * 
 * DESIGN SYSTEM: This component follows the eth-mcp Frontend Design Guide
 * - Uses DaisyUI theme tokens only (no custom colors)
 * - Recommended theme: "corporate" for DeFi/Finance apps
 * - No gradients, no glassmorphism, no large shadows
 * - Shadows limited to shadow-sm (stats, info) and shadow-md (main card)
 * - References: Etherscan, Aave Dashboard styling
 */

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import {
  useScaffoldContractRead,
  useScaffoldContractWrite,
} from "~~/hooks/scaffold-eth";

interface VaultUIProps {
  vaultName: string; // Contract name in deployedContracts
  assetSymbol: string; // e.g., "USDC"
  assetDecimals: number; // e.g., 6 for USDC
}

export default function VaultUI({
  vaultName,
  assetSymbol,
  assetDecimals,
}: VaultUIProps) {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Read vault data
  const { data: totalAssets } = useScaffoldContractRead({
    contractName: vaultName,
    functionName: "totalAssets",
  });

  const { data: totalSupply } = useScaffoldContractRead({
    contractName: vaultName,
    functionName: "totalSupply",
  });

  const { data: userShares } = useScaffoldContractRead({
    contractName: vaultName,
    functionName: "balanceOf",
    args: [address],
  });

  const { data: userAssetValue } = useScaffoldContractRead({
    contractName: vaultName,
    functionName: "convertToAssets",
    args: [userShares || 0n],
  });

  const { data: previewDepositShares } = useScaffoldContractRead({
    contractName: vaultName,
    functionName: "previewDeposit",
    args: [depositAmount ? parseUnits(depositAmount, assetDecimals) : 0n],
  });

  const { data: previewWithdrawShares } = useScaffoldContractRead({
    contractName: vaultName,
    functionName: "previewWithdraw",
    args: [withdrawAmount ? parseUnits(withdrawAmount, assetDecimals) : 0n],
  });

  // Write functions
  const { writeAsync: deposit, isLoading: isDepositing } =
    useScaffoldContractWrite({
      contractName: vaultName,
      functionName: "deposit",
      args: [
        depositAmount ? parseUnits(depositAmount, assetDecimals) : 0n,
        address,
      ],
    });

  const { writeAsync: withdraw, isLoading: isWithdrawing } =
    useScaffoldContractWrite({
      contractName: vaultName,
      functionName: "withdraw",
      args: [
        withdrawAmount ? parseUnits(withdrawAmount, assetDecimals) : 0n,
        address,
        address,
      ],
    });

  // Calculate share price
  const sharePrice =
    totalSupply && totalAssets && totalSupply > 0n
      ? Number(formatUnits(totalAssets, assetDecimals)) /
        Number(formatUnits(totalSupply, 18))
      : 1;

  // Format display values
  const formatAsset = (value: bigint | undefined) => {
    if (!value) return "0.00";
    return Number(formatUnits(value, assetDecimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatShares = (value: bigint | undefined) => {
    if (!value) return "0.00";
    return Number(formatUnits(value, 18)).toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  };

  return (
    <div className="flex flex-col items-center pt-10 px-4">
      <h1 className="text-4xl font-bold mb-2">Yield Vault</h1>
      <p className="text-lg text-base-content/70 mb-8">
        Deposit {assetSymbol} to earn yield
      </p>

      {/* Vault Stats - shadow-sm for secondary containers */}
      <div className="stats shadow-sm mb-8 bg-base-200 border border-base-300">
        <div className="stat">
          <div className="stat-title">Total Deposited</div>
          <div className="stat-value text-2xl">
            {formatAsset(totalAssets)} {assetSymbol}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Share Price</div>
          <div className="stat-value text-2xl">
            {sharePrice.toFixed(4)} {assetSymbol}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Your Position</div>
          <div className="stat-value text-2xl">
            {formatAsset(userAssetValue)} {assetSymbol}
          </div>
          <div className="stat-desc">{formatShares(userShares)} shares</div>
        </div>
      </div>

      {/* Deposit/Withdraw Card - shadow-md max per design system */}
      <div className="card w-full max-w-md bg-base-100 shadow-md border border-base-300">
        <div className="card-body">
          {/* Tab Buttons */}
          <div className="tabs tabs-boxed mb-4">
            <button
              className={`tab flex-1 ${activeTab === "deposit" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("deposit")}
            >
              Deposit
            </button>
            <button
              className={`tab flex-1 ${activeTab === "withdraw" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("withdraw")}
            >
              Withdraw
            </button>
          </div>

          {activeTab === "deposit" ? (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount to Deposit</span>
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="input input-bordered w-full"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <span className="bg-base-300 px-4 flex items-center">
                    {assetSymbol}
                  </span>
                </div>
              </div>

              {depositAmount && (
                <div className="mt-4 p-3 bg-base-300 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>You will receive:</span>
                    <span>{formatShares(previewDepositShares)} shares</span>
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary mt-4"
                onClick={() => deposit()}
                disabled={!depositAmount || isDepositing}
              >
                {isDepositing ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  `Deposit ${assetSymbol}`
                )}
              </button>
            </>
          ) : (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount to Withdraw</span>
                  <span className="label-text-alt">
                    Max: {formatAsset(userAssetValue)} {assetSymbol}
                  </span>
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="input input-bordered w-full"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <span className="bg-base-300 px-4 flex items-center">
                    {assetSymbol}
                  </span>
                </div>
              </div>

              {withdrawAmount && (
                <div className="mt-4 p-3 bg-base-300 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Shares to burn:</span>
                    <span>{formatShares(previewWithdrawShares)}</span>
                  </div>
                </div>
              )}

              <button
                className="btn btn-secondary mt-4"
                onClick={() => withdraw()}
                disabled={!withdrawAmount || isWithdrawing}
              >
                {isWithdrawing ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  `Withdraw ${assetSymbol}`
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-8 max-w-md text-center text-sm text-base-content/60">
        <p>
          This vault earns yield by deploying your {assetSymbol} to various DeFi
          protocols. Your shares represent your proportional ownership of the
          vault.
        </p>
      </div>
    </div>
  );
}
