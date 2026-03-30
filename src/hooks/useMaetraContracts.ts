/**
 * useMaetraContracts — on-chain interaction hook for Maetra Fhenix contracts.
 *
 * Replaces useAleoPrograms.ts. Uses:
 *   - wagmi's useWalletClient / usePublicClient for EVM tx signing
 *   - cofhesdkClient for FHE input encryption and output decryption
 *   - viem for contract calls and event parsing
 */

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { getContract, parseUnits, keccak256, toHex, type Hex } from "viem";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { getCofheClient } from "@/lib/cofhe-client";
import {
  CONTRACT_ADDRESSES,
  USDC_ADDRESS,
  USDC_DECIMALS,
  ERC20_ABI,
  MAETRA_TRUST_ABI,
  MAETRA_SUBSCRIPTION_ABI,
  MAETRA_CONTENT_ABI,
} from "@/lib/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PerformanceInputs {
  profitable_days: number;
  total_days:      number;
  trade_count:     number;
  avg_volume_usd:  number; // whole dollars; internally converted to cents
  current_streak:  number;
}

export interface TrustScoreResult {
  trustScore:  bigint;
  winRate:     bigint;
  weightClass: boolean | bigint; // FheTypes.Uint8 returns bigint (0,1,2)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMaetraContracts() {
  const { address, isConnected } = useAccount();
  const publicClient             = usePublicClient();
  const { data: walletClient }   = useWalletClient();

  const [pending,   setPending]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<Hex | null>(null);

  // ── Internal: gas overrides with 20% buffer to avoid baseFee races ───────────
  const getGasOverrides = useCallback(async () => {
    const fees = await publicClient!.estimateFeesPerGas();
    return {
      maxFeePerGas:         fees.maxFeePerGas         ? fees.maxFeePerGas         * 120n / 100n : undefined,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas ? fees.maxPriorityFeePerGas * 120n / 100n : undefined,
    };
  }, [publicClient]);

  // ── Internal: get viem contract instances ──────────────────────────────────
  const getTrustContract = useCallback(() => {
    if (!walletClient || !publicClient) return null;
    return getContract({
      address: CONTRACT_ADDRESSES.MaetraTrust as Hex,
      abi:     MAETRA_TRUST_ABI,
      client:  { public: publicClient, wallet: walletClient },
    });
  }, [walletClient, publicClient]);

  const getSubContract = useCallback(() => {
    if (!walletClient || !publicClient) return null;
    return getContract({
      address: CONTRACT_ADDRESSES.MaetraSubscription as Hex,
      abi:     MAETRA_SUBSCRIPTION_ABI,
      client:  { public: publicClient, wallet: walletClient },
    });
  }, [walletClient, publicClient]);

  const getContentContract = useCallback(() => {
    if (!walletClient || !publicClient) return null;
    return getContract({
      address: CONTRACT_ADDRESSES.MaetraContent as Hex,
      abi:     MAETRA_CONTENT_ABI,
      client:  { public: publicClient, wallet: walletClient },
    });
  }, [walletClient, publicClient]);

  // ── submitPerformance ──────────────────────────────────────────────────────
  /**
   * Encrypt performance metrics and submit to MaetraTrust.submitPerformance().
   * Volume is passed in whole USD dollars and converted to cents internally.
   */
  const submitPerformance = useCallback(
    async (inputs: PerformanceInputs): Promise<Hex | null> => {
      if (!isConnected || !address) { setError("Wallet not connected"); return null; }
      const trust = getTrustContract();
      if (!trust) { setError("Contract unavailable"); return null; }

      setPending(true);
      setError(null);

      try {
        // Encrypt all 5 inputs as euint32
        const cofhesdkClient = await getCofheClient();
        const encResult = await cofhesdkClient
          .encryptInputs([
            Encryptable.uint32(BigInt(inputs.profitable_days)),
            Encryptable.uint32(BigInt(inputs.total_days)),
            Encryptable.uint32(BigInt(inputs.trade_count)),
            // Convert dollars → cents to match contract volume thresholds
            Encryptable.uint32(BigInt(inputs.avg_volume_usd * 100)),
            Encryptable.uint32(BigInt(inputs.current_streak)),
          ])
          .encrypt();

        if (!encResult.success) {
          setError("Encryption failed: " + String(encResult.error));
          return null;
        }

        const [ep, et, ec, ev, es] = encResult.data;
        const gas = await getGasOverrides();

        // @ts-ignore — viem infers contract write types; inputs match InEuint32 tuple
        const hash = await trust.write.submitPerformance([ep, et, ec, ev, es], gas);
        setLastTxHash(hash);

        // Wait for confirmation
        await publicClient!.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        return null;
      } finally {
        setPending(false);
      }
    },
    [isConnected, address, getTrustContract, publicClient, getGasOverrides],
  );

  // ── optIntoLeaderboard ─────────────────────────────────────────────────────
  const optIntoLeaderboard = useCallback(async (): Promise<Hex | null> => {
    if (!isConnected) { setError("Wallet not connected"); return null; }
    const trust = getTrustContract();
    if (!trust) { setError("Contract unavailable"); return null; }

    setPending(true);
    setError(null);
    try {
      const gas = await getGasOverrides();
      const hash = await trust.write.optIntoLeaderboard([], gas);
      setLastTxHash(hash);
      await publicClient!.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setPending(false);
    }
  }, [isConnected, getTrustContract, publicClient, getGasOverrides]);

  // ── decryptMyTrustScore ────────────────────────────────────────────────────
  /**
   * Read and decrypt the caller's own trust score, win rate, and weight class.
   * Requires the user to have called submitPerformance() first.
   * No on-chain tx needed — pure off-chain decryption via CoFHE SDK.
   */
  const decryptMyTrustScore = useCallback(async (): Promise<TrustScoreResult | null> => {
    if (!isConnected || !address || !publicClient) { setError("Wallet not connected"); return null; }

    try {
      const trust = getContract({
        address: CONTRACT_ADDRESSES.MaetraTrust as Hex,
        abi:     MAETRA_TRUST_ABI,
        client:  publicClient,
      });

      const [scoreHandle, rateHandle, weightHandle] = await Promise.all([
        trust.read.trustScores([address]),
        trust.read.winRates([address]),
        trust.read.weightClasses([address]),
      ]);

      const cofhesdkClient = await getCofheClient();
      const [scoreResult, rateResult, weightResult] = await Promise.all([
        cofhesdkClient.decryptHandle(scoreHandle  as unknown as bigint, FheTypes.Uint32).decrypt(),
        cofhesdkClient.decryptHandle(rateHandle   as unknown as bigint, FheTypes.Uint32).decrypt(),
        cofhesdkClient.decryptHandle(weightHandle as unknown as bigint, FheTypes.Uint8).decrypt(),
      ]);

      if (!scoreResult.success || !rateResult.success || !weightResult.success) {
        setError("Decryption failed — ensure you have submitted performance data");
        return null;
      }

      return {
        trustScore:  scoreResult.data  as bigint,
        winRate:     rateResult.data   as bigint,
        weightClass: weightResult.data as bigint,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [isConnected, address, publicClient]);

  // ── setPrice ───────────────────────────────────────────────────────────────
  /**
   * Set creator's subscription price.
   * @param priceUsdc Price as a decimal USDC string, e.g. "10" for $10
   */
  const setSubscriptionPrice = useCallback(
    async (priceUsdc: string): Promise<Hex | null> => {
      if (!isConnected) { setError("Wallet not connected"); return null; }
      const sub = getSubContract();
      if (!sub) { setError("Contract unavailable"); return null; }

      setPending(true);
      setError(null);
      try {
        const gas = await getGasOverrides();
        const hash = await sub.write.setPrice([parseUnits(priceUsdc, USDC_DECIMALS)], gas);
        setLastTxHash(hash);
        await publicClient!.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setPending(false);
      }
    },
    [isConnected, getSubContract, publicClient, getGasOverrides],
  );

  // ── subscribe ──────────────────────────────────────────────────────────────
  /**
   * Subscribe to a creator. Approves USDC then calls subscribe().
   * priceUsdc is in raw USDC units (6 decimals bigint), e.g. 10_000_000n = $10.
   * Returns the subscribe tx hash which is sent to the backend for verification.
   */
  const subscribe = useCallback(
    async (creatorAddress: Hex, priceUsdc: bigint): Promise<Hex | null> => {
      if (!isConnected || !address) { setError("Wallet not connected"); return null; }
      const sub = getSubContract();
      if (!walletClient || !publicClient) { setError("Contract unavailable"); return null; }

      setPending(true);
      setError(null);
      try {
        const subAddress = CONTRACT_ADDRESSES.MaetraSubscription as Hex;

        // Step 1: approve USDC if needed
        if (priceUsdc > 0n) {
          const usdcContract = getContract({
            address: USDC_ADDRESS,
            abi:     ERC20_ABI,
            client:  { public: publicClient, wallet: walletClient },
          });

          const allowance = await usdcContract.read.allowance([address, subAddress]);
          if ((allowance as bigint) < priceUsdc) {
            const gas = await getGasOverrides();
            const approveTx = await usdcContract.write.approve([subAddress, priceUsdc], gas);
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
          }
        }

        // Step 2: subscribe
        const gas = await getGasOverrides();
        const hash = await sub!.write.subscribe([creatorAddress], gas);
        setLastTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setPending(false);
      }
    },
    [isConnected, address, getSubContract, walletClient, publicClient, getGasOverrides],
  );

  // ── checkMySubscription ────────────────────────────────────────────────────
  /**
   * Decrypt own subscription status for a given creator (off-chain, no tx).
   */
  const checkMySubscription = useCallback(
    async (creatorAddress: Hex): Promise<boolean | null> => {
      if (!isConnected || !address || !publicClient) { setError("Wallet not connected"); return null; }

      try {
        const sub = getContract({
          address: CONTRACT_ADDRESSES.MaetraSubscription as Hex,
          abi:     MAETRA_SUBSCRIPTION_ABI,
          client:  publicClient,
        });

        const activeHandle = await sub.read.subscriptionActive([creatorAddress, address]);
        const cofhesdkClient = await getCofheClient();
        const result = await cofhesdkClient
          .decryptHandle(activeHandle as unknown as bigint, FheTypes.Bool)
          .decrypt();

        if (!result.success) {
          setError("Decryption failed");
          return null;
        }
        return result.data as boolean;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [isConnected, address, publicClient],
  );

  // ── publishContent ─────────────────────────────────────────────────────────
  /**
   * Publish a content hash on-chain for timestamping.
   * @param contentBlob The encrypted content string (stored in DB); hashed here.
   * @returns { txHash, postId, contentHash }
   */
  const publishContent = useCallback(
    async (contentBlob: string): Promise<{ txHash: Hex; contentHash: Hex } | null> => {
      if (!isConnected) { setError("Wallet not connected"); return null; }
      const content = getContentContract();
      if (!content) { setError("Contract unavailable"); return null; }

      setPending(true);
      setError(null);
      try {
        const contentHash = keccak256(toHex(contentBlob)) as Hex;
        const gas = await getGasOverrides();
        const hash = await content.write.publishContent([contentHash], gas);
        setLastTxHash(hash);
        await publicClient!.waitForTransactionReceipt({ hash });
        return { txHash: hash, contentHash };
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setPending(false);
      }
    },
    [isConnected, getContentContract, publicClient, getGasOverrides],
  );

  return {
    // Actions
    submitPerformance,
    optIntoLeaderboard,
    setSubscriptionPrice,
    subscribe,
    publishContent,
    // Reads (off-chain decrypt)
    decryptMyTrustScore,
    checkMySubscription,
    // State
    pending,
    error,
    lastTxHash,
    connected: isConnected,
    address,
  };
}
