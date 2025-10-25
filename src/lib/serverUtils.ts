export function createErrors({
  apiKey,
  chain,
  contractAddress,
}: {
  apiKey: string | undefined;
  chain: string | null;
  contractAddress: string | null;
}) {
  const errors = [];
  if (!apiKey) {
    console.error("No API key found for etherscan");
    console.error(
      "Please set the API key in the .env file",
      `ETHEREUM_ETHERSCAN_API_KEY`
    );
    errors.push("API key not configured.");
  }
  if (!chain) {
    errors.push("Chain not specified");
  }
  if (!contractAddress) {
    errors.push("Contract address not specified");
  }
  return errors;
}
