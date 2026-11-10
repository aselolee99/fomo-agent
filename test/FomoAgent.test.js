const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Fomo Agent DApp", function () {
  const HANDLE = "myagent";
  let agentId;
  let token, nft, registry;
  let owner, user, stranger;

  beforeEach(async function () {
    [owner, user, stranger] = await ethers.getSigners();
    agentId = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes(HANDLE)));

    const Token = await ethers.getContractFactory("FomoToken");
    token = await Token.deploy();

    const Registry = await ethers.getContractFactory("MockAgentRegistry");
    registry = await Registry.deploy();

    const Nft = await ethers.getContractFactory("FomoAgentNFT");
    nft = await Nft.deploy(await token.getAddress(), await registry.getAddress());

    // NFT contract jadi satu-satunya minter $AF
    await token.setMinter(await nft.getAddress());

    // Daftarkan Agent ID "myagent" milik user di mock registry
    await registry.setOwner(agentId, user.address);
  });

  it("freeMint: 1 gratis per Agent ID", async function () {
    await expect(nft.connect(user).freeMint(agentId))
      .to.emit(nft, "FreeMinted")
      .withArgs(user.address, agentId, 1);
    expect(await nft.balanceOf(user.address)).to.equal(1);
    expect(await nft.freeClaimed(agentId)).to.equal(true);
  });

  it("freeMint: tidak bisa klaim 2x untuk Agent ID yang sama", async function () {
    await nft.connect(user).freeMint(agentId);
    await expect(nft.connect(user).freeMint(agentId)).to.be.revertedWith("already claimed");
  });

  it("freeMint: kuota gratis maks 100 total", async function () {
    for (let i = 0; i < 100; i++) {
      const id = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes("agent" + i)));
      await registry.setOwner(id, user.address);
      await nft.connect(user).freeMint(id);
    }
    expect(await nft.freeMinted()).to.equal(100);
    const extra = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes("agent100")));
    await registry.setOwner(extra, user.address);
    await expect(nft.connect(user).freeMint(extra)).to.be.revertedWith("free sold out");
  });

  it("freeMint: bukan pemilik Agent ID ditolak", async function () {
    await expect(nft.connect(stranger).freeMint(agentId)).to.be.revertedWith("not agent owner");
  });

  it("paidMint: 0,0004 BNB/NFT, maks 5/wallet", async function () {
    const price = await nft.PAID_PRICE();
    await nft.connect(user).paidMint(2, { value: price * 2n });
    expect(await nft.balanceOf(user.address)).to.equal(2);

    // Nilai salah ditolak
    await expect(nft.connect(user).paidMint(1, { value: 0 })).to.be.revertedWith("wrong value");
    // Melewati cap 5/wallet ditolak (sudah 2, tambah 4 = 6)
    await expect(nft.connect(user).paidMint(4, { value: price * 4n })).to.be.revertedWith("wallet cap");
    // 3 lagi masih boleh (total 5)
    await nft.connect(user).paidMint(3, { value: price * 3n });
    expect(await nft.balanceOf(user.address)).to.equal(5);
  });

  it("claim: 1.000 AF per NFT tiap 24 jam", async function () {
    await nft.connect(user).freeMint(agentId);
    const tokenId = 1;

    await expect(nft.connect(user).claim(tokenId))
      .to.emit(nft, "Claimed")
      .withArgs(user.address, tokenId, ethers.parseEther("1000"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("1000"));

    // Klaim kedua di hari yang sama ditolak
    await expect(nft.connect(user).claim(tokenId)).to.be.revertedWith("cooldown");

    // Setelah 24 jam + 1 detik bisa klaim lagi
    await time.increase(24 * 3600 + 1);
    await nft.connect(user).claim(tokenId);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("2000"));
  });

  it("claim: bukan pemilik NFT ditolak", async function () {
    await nft.connect(user).freeMint(agentId);
    await expect(nft.connect(stranger).claim(1)).to.be.revertedWith("not owner");
  });

  it("claimable: view jumlah & waktu klaim berikutnya", async function () {
    await nft.connect(user).freeMint(agentId);
    let [canClaim] = await nft.claimable(1);
    expect(canClaim).to.equal(true);
    await nft.connect(user).claim(1);
    [canClaim] = await nft.claimable(1);
    expect(canClaim).to.equal(false);
  });

  it("withdraw: owner bisa tarik BNB hasil paid mint", async function () {
    const price = await nft.PAID_PRICE();
    await nft.connect(user).paidMint(1, { value: price });
    expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(price);
    await expect(nft.withdraw()).to.not.be.reverted;
    expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
  });

  it("setAgentRegistry: hanya owner", async function () {
    await expect(nft.connect(stranger).setAgentRegistry(stranger.address)).to.be.revertedWithCustomError(
      nft,
      "OwnableUnauthorizedAccount"
    );
  });
});
