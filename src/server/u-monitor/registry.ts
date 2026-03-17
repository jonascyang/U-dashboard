export const U_MONITOR_CONTRACT_ADDRESS = "0xcE24439F2D9C6a2289F741120FE202248B666666" as const;
export const U_MONITOR_BSC_CHAIN = "BSC" as const;
export const U_MONITOR_BSC_CHAIN_ID = 56 as const;

export type UMonitorSource = {
  venue: "Binance" | "LBank" | "HTX" | "PancakeSwap V3";
  pair: "U/USDT";
  sourceType: "CEX" | "DEX";
  transport: "websocket-first";
  websocketUrl: string;
  restUrl?: string;
  marketSymbol: string;
  fallbackQuoteVolume24h?: number;
};

export const uMonitorSources: UMonitorSource[] = [
  {
    venue: "Binance",
    pair: "U/USDT",
    sourceType: "CEX",
    transport: "websocket-first",
    websocketUrl: "wss://data-stream.binance.vision/ws",
    restUrl: "https://api.binance.com",
    marketSymbol: "UUSDT"
  },
  {
    venue: "LBank",
    pair: "U/USDT",
    sourceType: "CEX",
    transport: "websocket-first",
    websocketUrl: "wss://www.lbkex.net/ws/V2/",
    restUrl: "https://api.lbkex.com",
    marketSymbol: "u_usdt"
  },
  {
    venue: "HTX",
    pair: "U/USDT",
    sourceType: "CEX",
    transport: "websocket-first",
    websocketUrl: "wss://api-aws.huobi.pro/ws",
    restUrl: "https://api.huobi.pro",
    marketSymbol: "uusdt"
  },
  {
    venue: "PancakeSwap V3",
    pair: "U/USDT",
    sourceType: "DEX",
    transport: "websocket-first",
    websocketUrl: "wss://bsc-ws-node.nariox.org:443",
    marketSymbol: "0xa0909f81785f87f3e79309f0e73a7d82208094e4",
    fallbackQuoteVolume24h: 275670
  }
];
