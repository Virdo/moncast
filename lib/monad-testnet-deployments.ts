/**
 * Public contract addresses for the current Moncast Monad testnet deployment.
 *
 * These are not secrets. Keeping them in source makes production builds usable
 * even when a hosting provider omits NEXT_PUBLIC_* values during bundling.
 * Environment variables can still override them for a future deployment.
 */
export const monadTestnetDeployments = {
  collateralToken: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  verifier: "0x32867799f03d56aac4D2A900e4b9B4404A056ed1",
  protocol: "0x97716448e8a4a9d282ce2c7788ce979cde4d1a20",
} as const;
