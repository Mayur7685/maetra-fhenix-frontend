/**
 * CoFHE SDK client — lazily initialized on first use.
 *
 * The module is loaded only when getCofheClient() is first called (on user
 * interaction — wallet connect, encrypt, decrypt). Turbopack bundles
 * @cofhe/sdk/web including the tfhe WASM module via async WebAssembly.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any | null = null;
let _initPromise: Promise<void> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCofheClient(): Promise<any> {
  if (_client) return _client;

  if (!_initPromise) {
    _initPromise = (async () => {
      try {
        const [sdkWeb, sdkChains] = await Promise.all([
          import("@cofhe/sdk/web"),
          import("@cofhe/sdk/chains"),
        ]);

        const { createCofhesdkConfig, createCofhesdkClient } = sdkWeb;
        const { arbSepolia, hardhat } = sdkChains;

        const config = createCofhesdkConfig({
          supportedChains: [hardhat, arbSepolia],
          mocks: { sealOutputDelay: 500 },
        });

        _client = createCofhesdkClient(config);
      } catch (err) {
        console.warn("[CoFHE] SDK failed to load:", err);
        // No-op stub so callers don't crash when SDK is unavailable
        _client = {
          connect:       async () => ({ success: false, error: new Error("CoFHE not ready") }),
          encryptInputs: () => ({ encrypt: async () => ({ success: false, data: [], error: new Error("CoFHE not ready") }) }),
          decryptHandle: () => ({ decrypt: async () => ({ success: false, error: new Error("CoFHE not ready") }) }),
        };
      }
    })();
  }

  await _initPromise;
  return _client;
}
