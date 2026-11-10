// Daftarkan Agent ID (handle) di MockAgentRegistry testnet agar free mint bisa dites.
// Jalankan SETELAH deploy testnet:
//   DEPLOYER_KEY=$(grep DEPLOYER_KEY .env | cut -d= -f2) npx hardhat run scripts/register-test-agent.js --network bscTestnet
// Handle & owner bisa diubah lewat env: AGENT_HANDLE, AGENT_OWNER.
const hre = require("hardhat");
const fs = require("node:fs");

async function main() {
  const handle = process.env.AGENT_HANDLE || "myagent";
  const owner = process.env.AGENT_OWNER || "0x2CB99b476130e93BAA53FF2e4112a987c39C4615";
  const dep = JSON.parse(fs.readFileSync("deployments/bscTestnet.json", "utf8"));

  const agentId = hre.ethers.toBigInt(hre.ethers.keccak256(hre.ethers.toUtf8Bytes(handle)));
  console.log("Handle:", handle, "| agentId:", agentId.toString());

  const registry = await hre.ethers.getContractAt("MockAgentRegistry", dep.agentRegistry);
  await (await registry.setOwner(agentId, owner)).wait();
  console.log("Terdaftar:", handle, "->", owner);
  console.log("Verifikasi ownerOf:", await registry.ownerOf(agentId));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
