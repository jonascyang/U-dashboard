export const lendingEventSignatures = {
  Deposit: "0x1de6db4f3fb9618cb9088e4f72f2f5f139f2ec2f4d36cc3f75f1a4cbb5c70f89",
  Withdraw: "0xe1fffcc4923d02b72f9f8c9df3d87921f4caa6f3e0c6f1dd4e7e0b8f22f9f4f6",
  Borrow: "0x3a5f25e92f6bdc90f50e57f6d1ed5f7d6e8a4f97d09be4bd93c0b7309f6f4f3b",
  Repay: "0x8f1f0fbb4c5fbd0c155fbc3f9f8496e2f3ce803b8f7e33f0f9a30f7615f8d24f",
  Liquidation: "0xe3d3f5a8f2f9a0f6b4a91fbd84ee6da3ad5f3489f5c4cb5d3525e7a64de7f8a1"
} as const;

export type LendingEventType = keyof typeof lendingEventSignatures;
