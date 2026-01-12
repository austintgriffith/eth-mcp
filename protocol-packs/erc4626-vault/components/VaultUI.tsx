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
 *
 * TRANSACTION FLOW: This component demonstrates the CORRECT approve-then-deposit pattern
 * - Checks allowance before showing deposit button
 * - Waits for approval tx to be MINED (not just signed!)
 * - Re-reads allowance after confirmation before enabling deposit
 * - Shows clear loading states: "Approve in Wallet..." -> "Confirming..." -> "Deposit"
 *
 * See: docs/WEB3_DEVELOPMENT_GUIDE.md and docs/FRONTEND_DESIGN_GUIDE.md
 */

import { useState, useEffect } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useDeployedContractInfo,
} from "~~/hooks/scaffold-eth";

interface VaultUIProps {
  vaultName: string; // Contract name in deployedContracts
  assetName: string; // Asset contract name in externalContracts (e.g., "USDC")
  assetSymbol: string; // Display symbol (e.g., "USDC")
  assetDecimals: number; // e.g., 6 for USDC
}

/**
 * Transaction state machine for approve-then-deposit flow
 * CRITICAL: Never skip "confirming" state - tx hash !== confirmation!
 */
type TxState = "idle" | "approving" | "confirming" | "depositing";

export default function VaultUI({
  vaultName,
  assetName,
  assetSymbol,
  assetDecimals,
}: VaultUIProps) {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Transaction state machine
  const [txState, setTxState] = useState<TxState>("idle");
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Get vault address dynamically (NEVER hardcode!)
  const { data: vaultInfo } = useDeployedContractInfo(vaultName);
  const vaultAddress = vaultInfo?.address;

  // Parse deposit amount to bigint
  const depositAmountBigInt = depositAmount
    ? parseUnits(depositAmount, assetDecimals)
    : 0n;

  // ==========================================
  // CRITICAL: Allowance checking for approve flow
  // ==========================================
  const { data: allowance, refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: assetName,
    functionName: "allowance",
    args: [address, vaultAddress],
  });

  // Determine if approval is needed
  const needsApproval =
    depositAmountBigInt > 0n && (!allowance || allowance < depositAmountBigInt);

  // ==========================================
  // CRITICAL: Wait for approval tx to be MINED
  // ==========================================
  const { isSuccess: approvalConfirmed, isError: approvalFailed } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
    });

  // When approval tx is confirmed, refetch allowance and reset state
  useEffect(() => {
    if (approvalConfirmed && txState === "confirming") {
      // CRITICAL: Re-read on-chain state after confirmation
      refetchAllowance().then(() => {
        setTxState("idle");
        setApproveTxHash(undefined);
        setError(null);
      });
    }
  }, [approvalConfirmed, txState, refetchAllowance]);

  // Handle approval failure
  useEffect(() => {
    if (approvalFailed && txState === "confirming") {
      setTxState("idle");
      setApproveTxHash(undefined);
      setError("Approval transaction failed");
    }
  }, [approvalFailed, txState]);

  // Read vault data
  const { data: totalAssets } = useScaffoldReadContract({
    contractName: vaultName,
    functionName: "totalAssets",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: vaultName,
    functionName: "totalSupply",
  });

  const { data: userShares } = useScaffoldReadContract({
    contractName: vaultName,
    functionName: "balanceOf",
    args: [address],
  });

  const { data: userAssetValue } = useScaffoldReadContract({
    contractName: vaultName,
    functionName: "convertToAssets",
    args: [userShares || 0n],
  });

  const { data: previewDepositShares } = useScaffoldReadContract({
    contractName: vaultName,
    functionName: "previewDeposit",
    args: [depositAmountBigInt],
  });

  const { data: previewWithdrawShares } = useScaffoldReadContract({
    contractName: vaultName,
    functionName: "previewWithdraw",
    args: [withdrawAmount ? parseUnits(withdrawAmount, assetDecimals) : 0n],
  });

  // Write functions
  const { writeContractAsync: writeAsset } = useScaffoldWriteContract(assetName);
  const { writeContractAsync: writeVault } = useScaffoldWriteContract(vaultName);

  // ==========================================
  // CRITICAL: Approve handler with proper state management
  // ==========================================
  const handleApprove = async () => {
    if (!vaultAddress || !depositAmountBigInt) return;

    setError(null);
    setTxState("approving");

    try {
      // Get tx hash from wallet signature
      const hash = await writeAsset({
        functionName: "approve",
        args: [vaultAddress, depositAmountBigInt],
      });

      // CRITICAL: Move to "confirming" state, NOT "idle"!
      // The tx is in the mempool but NOT mined yet
      setApproveTxHash(hash);
      setTxState("confirming");

      // useWaitForTransactionReceipt will handle the rest
      // and trigger the useEffect above when confirmed
    } catch (e) {
      console.error("Approve failed:", e);
      setError(e instanceof Error ? e.message : "Approval failed");
      setTxState("idle");
    }
  };

  // ==========================================
  // Deposit handler (only callable when approved)
  // ==========================================
  const handleDeposit = async () => {
    if (!address || !depositAmountBigInt) return;

    setError(null);
    setTxState("depositing");

    try {
      await writeVault({
        functionName: "deposit",
        args: [depositAmountBigInt, address],
      });

      // Success - reset form
      setDepositAmount("");
      setTxState("idle");
    } catch (e) {
      console.error("Deposit failed:", e);
      setError(e instanceof Error ? e.message : "Deposit failed");
      setTxState("idle");
    }
  };

  // Withdraw handler
  const handleWithdraw = async () => {
    if (!address || !withdrawAmount) return;

    setError(null);
    setTxState("depositing"); // Reuse for withdraw loading state

    try {
      await writeVault({
        functionName: "withdraw",
        args: [parseUnits(withdrawAmount, assetDecimals), address, address],
      });

      // Success - reset form
      setWithdrawAmount("");
      setTxState("idle");
    } catch (e) {
      console.error("Withdraw failed:", e);
      setError(e instanceof Error ? e.message : "Withdrawal failed");
      setTxState("idle");
    }
  };

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

  // ==========================================
  // Button text based on transaction state
  // ==========================================
  const getDepositButtonText = () => {
    if (txState === "approving") return "Approve in Wallet...";
    if (txState === "confirming") return "Confirming...";
    if (txState === "depositing") return "Depositing...";
    if (needsApproval) return `Approve ${assetSymbol}`;
    return `Deposit ${assetSymbol}`;
  };

  const isDepositButtonDisabled =
    !depositAmount ||
    txState !== "idle" ||
    !vaultAddress;

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

          {/* Error display */}
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

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
                    disabled={txState !== "idle"}
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
                  {needsApproval && (
                    <div className="flex justify-between text-sm mt-1 text-warning">
                      <span>Approval required:</span>
                      <span>{depositAmount} {assetSymbol}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 
                CRITICAL: Single button that handles both approve and deposit
                - Shows "Approve" when allowance insufficient
                - Shows "Confirming..." while waiting for tx to mine
                - Shows "Deposit" once approved
              */}
              <button
                className={`btn btn-primary mt-4 ${txState !== "idle" ? "loading" : ""}`}
                onClick={needsApproval ? handleApprove : handleDeposit}
                disabled={isDepositButtonDisabled}
              >
                {txState === "idle" ? (
                  getDepositButtonText()
                ) : (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {getDepositButtonText()}
                  </>
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
                    disabled={txState !== "idle"}
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
                className={`btn btn-secondary mt-4 ${txState === "depositing" ? "loading" : ""}`}
                onClick={handleWithdraw}
                disabled={!withdrawAmount || txState !== "idle"}
              >
                {txState === "depositing" ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Withdrawing...
                  </>
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
