"use client";
import { ethers } from "ethers";
export default function Test() {
  const wsProvider = new ethers.WebSocketProvider("wss://forno.celo.org/ws");

  // contract.on("Transfer", (from, to, amount, event) => {
  //   console.log("💡 Transfer", from, to, amount, event);
  // });

  const filter = {
    address: "0x65dd32834927de9e57e72a3e2130a19f81c6371d",
    // address: "0x765de816845861e75a25fca122bb6898b8b1282a", // cUSD
  };

  wsProvider.on(filter, (log) => {
    console.log("💡 filter match", log);
  });
  // wsProvider.websocket.onopen = (a) => {
  //   console.log("WebSocket connected", a);
  // };
  wsProvider.websocket.onmessage = (a) => {
    console.log("WebSocket message", a);
    const log = JSON.parse(a.data);
    console.log("💡 log", log.params?.result);
  };
  wsProvider.websocket.onerror = (err) => {
    console.warn("WebSocket error", err);
    // console.warn("WebSocket disconnected! Reconnecting...");
    // setTimeout(() => {
    //   provider = new ethers.WebSocketProvider(
    //     "wss://mainnet.infura.io/ws/v3/YOUR_INFURA_PROJECT_ID"
    //   );
    // }, 3000);
  };

  // wsProvider.on("logs", (logs) => {
  //   console.log("💡 Detected a token transfer involving any contract!", logs);
  // });
  // wsProvider.on("block", (block) => {
  //   console.log("💡 Detected a token transfer involving any contract!", block);
  // });

  return <div>Test</div>;
}
