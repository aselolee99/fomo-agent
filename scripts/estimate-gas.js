// Estimasi gas deploy Fomo ke BSC testnet (jalan di network Hardhat lokal).
// Gas deploy deterministik (bytecode sama), jadi angka ini = gas di testnet.
const hre = require("hardhat");

async function main() {
  const Registry = await hre.ethers.getContractFactory("MockAgentRegistry");
  const registry = await Registry.deploy();
  const rc1 = await registry.deploymentTransaction().wait();

  const Token = await hre.ethers.getContractFactory("FomoToken");
  const token = await Token.deploy();
  const rc2 = await token.deploymentTransaction().wait();

  const Nft = await hre.ethers.getContractFactory("FomoAgentNFT");
  const nft = await Nft.deploy(await token.getAddress(), await registry.getAddress());
  const rc3 = await nft.deploymentTransaction().wait();

  const tx = await token.setMinter(await nft.getAddress());
  const rc4 = await tx.wait();

  const total = rc1.gasUsed + rc2.gasUsed + rc3.gasUsed + rc4.gasUsed;
  console.log("MockAgentRegistry:", rc1.gasUsed.toString(), "gas");
  console.log("FomoToken:", rc2.gasUsed.toString(), "gas");
  console.log("FomoAgentNFT:", rc3.gasUsed.toString(), "gas");
  console.log("setMinter:", rc4.gasUsed.toString(), "gas");
  console.log("TOTAL:", total.toString(), "gas");
  for (const gwei of [3, 5, 10]) {
    console.log(`@${gwei} gwei:`, (Number(total) * gwei) / 1e9, "tBNB");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
