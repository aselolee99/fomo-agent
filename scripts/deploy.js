// Deploy Fomo Agent DApp.
//  - BSC testnet: deploy MockAgentRegistry (registry asli hanya ada di mainnet).
//  - BSC mainnet: wajib isi AGENT_REGISTRY=<alamat registry Binance Agent ID>.
// Jalankan:  npx hardhat run scripts/deploy.js --network bscTestnet
//             DEPLOYER_KEY=0x... npx hardhat run scripts/deploy.js --network bsc
const hre = require("hardhat");
const fs = require("node:fs");

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);

  let registryAddress;
  if (network === "bscTestnet") {
    const Registry = await hre.ethers.getContractFactory("MockAgentRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    registryAddress = await registry.getAddress();
    console.log("MockAgentRegistry:", registryAddress);
  } else {
    registryAddress = process.env.AGENT_REGISTRY;
    if (!registryAddress) throw new Error("Set AGENT_REGISTRY=<alamat registry Agent ID mainnet>");
    console.log("AgentRegistry (mainnet):", registryAddress);
  }

  const Token = await hre.ethers.getContractFactory("FomoToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  console.log("FomoToken ($AF):", await token.getAddress());

  const Nft = await hre.ethers.getContractFactory("FomoAgentNFT");
  const nft = await Nft.deploy(await token.getAddress(), registryAddress);
  await nft.waitForDeployment();
  console.log("FomoAgentNFT:", await nft.getAddress());

  // NFT contract jadi satu-satunya minter $AF
  await (await token.setMinter(await nft.getAddress())).wait();
  console.log("Minter $AF -> NFT contract: OK");

  const out = {
    network,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    agentRegistry: registryAddress,
    fomoToken: await token.getAddress(),
    fomoAgentNFT: await nft.getAddress(),
    maxSupply: 2000,
    freeMaxSupply: 100,
    paidPriceBNB: "0.0004",
    claimAmountAF: "1000",
    claimCooldownHours: 24,
  };
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(`deployments/${network}.json`, JSON.stringify(out, null, 2));
  fs.writeFileSync("deployments/latest.json", JSON.stringify(out, null, 2));
  console.log("Tersimpan: deployments/" + network + ".json");
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
