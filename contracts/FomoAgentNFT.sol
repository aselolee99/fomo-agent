// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FomoToken} from "./FomoToken.sol";

/// @notice Interface minimal registry Binance Agent ID (.ai).
/// @dev Hanya butuh ownerOf(agentId). Alamat registry di-set saat deploy
/// (mainnet) atau diganti owner bila registry berpindah.
interface IAgentRegistry {
    function ownerOf(uint256 agentId) external view returns (address);
}

/// @title Fomo Agent NFT
/// @notice Mint NFT lalu klaim $AF tiap hari.
///  - freeMint(agentId): 1 gratis per Agent ID .ai (dicek ke registry),
///    kuota gratis maks 100 total (first come, first served).
///  - paidMint(qty): 0,0004 BNB per NFT, maks 5 per wallet.
///  - claim(tokenId): tiap NFT klaim 1.000 AF tiap 24 jam.
/// @dev Supply maks 2.000 NFT (100 di antaranya gratis).
contract FomoAgentNFT is ERC721, ERC721Enumerable, Ownable {
    uint256 public constant MAX_SUPPLY = 2000;
    uint256 public constant FREE_MAX_SUPPLY = 100;
    uint256 public constant PAID_PRICE = 0.0004 ether;
    uint256 public constant MAX_PAID_PER_WALLET = 5;
    uint256 public constant CLAIM_AMOUNT = 1000 ether; // 1.000 AF
    uint256 public constant CLAIM_COOLDOWN = 1 days;

    FomoToken public immutable token;
    address public agentRegistry;

    uint256 public nextTokenId = 1;
    uint256 public freeMinted;
    string private baseTokenURI;

    mapping(uint256 => bool) public freeClaimed; // agentId => sudah klaim gratis
    mapping(address => uint256) public paidMinted; // wallet => jumlah paid mint
    mapping(uint256 => uint256) public lastClaim; // tokenId => timestamp klaim terakhir

    event FreeMinted(address indexed to, uint256 indexed agentId, uint256 indexed tokenId);
    event PaidMinted(address indexed to, uint256 quantity, uint256 firstTokenId);
    event Claimed(address indexed to, uint256 indexed tokenId, uint256 amount);
    event RegistrySet(address indexed registry);

    constructor(address _token, address _agentRegistry) ERC721("Fomo Agent", "FOMO") Ownable(msg.sender) {
        require(_token != address(0), "token zero");
        token = FomoToken(_token);
        agentRegistry = _agentRegistry;
    }

    /// @notice Ganti alamat registry Agent ID (mis. saat deploy mainnet).
    function setAgentRegistry(address _registry) external onlyOwner {
        agentRegistry = _registry;
        emit RegistrySet(_registry);
    }

    /// @notice Set base URI metadata (IPFS). tokenURI = baseURI + tokenId.
    function setBaseURI(string calldata uri) external onlyOwner {
        baseTokenURI = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    /// @notice Mint gratis 1 NFT untuk 1 Agent ID. agentId = uint256(keccak256(handle)).
    /// @dev Kuota gratis maks 100 total; selebihnya harus paid mint.
    function freeMint(uint256 agentId) external {
        require(agentRegistry != address(0), "registry unset");
        require(!freeClaimed[agentId], "already claimed");
        require(freeMinted < FREE_MAX_SUPPLY, "free sold out");
        require(IAgentRegistry(agentRegistry).ownerOf(agentId) == msg.sender, "not agent owner");
        require(nextTokenId <= MAX_SUPPLY, "sold out");

        freeClaimed[agentId] = true;
        freeMinted++;
        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        emit FreeMinted(msg.sender, agentId, tokenId);
    }

    /// @notice Mint berbayar 0,0004 BNB/NFT, maks 5 per wallet.
    function paidMint(uint256 qty) external payable {
        require(qty >= 1 && qty <= MAX_PAID_PER_WALLET, "qty 1-5");
        require(msg.value == PAID_PRICE * qty, "wrong value");
        require(paidMinted[msg.sender] + qty <= MAX_PAID_PER_WALLET, "wallet cap");
        require(nextTokenId + qty - 1 <= MAX_SUPPLY, "sold out");

        paidMinted[msg.sender] += qty;
        uint256 firstTokenId = nextTokenId;
        for (uint256 i = 0; i < qty; i++) {
            _safeMint(msg.sender, nextTokenId++);
        }
        emit PaidMinted(msg.sender, qty, firstTokenId);
    }

    /// @notice Klaim 1.000 AF untuk 1 NFT. Bisa diulang tiap 24 jam.
    function claim(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        require(block.timestamp >= lastClaim[tokenId] + CLAIM_COOLDOWN, "cooldown");
        lastClaim[tokenId] = block.timestamp;
        token.mint(msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender, tokenId, CLAIM_AMOUNT);
    }

    /// @notice Cek apakah `tokenId` sudah bisa klaim lagi (dan kapan).
    function claimable(uint256 tokenId) external view returns (bool canClaim, uint256 nextClaimAt) {
        nextClaimAt = lastClaim[tokenId] + CLAIM_COOLDOWN;
        // Klaim pertama (lastClaim == 0) selalu bisa.
        canClaim = lastClaim[tokenId] == 0 || block.timestamp >= nextClaimAt;
        if (lastClaim[tokenId] == 0) nextClaimAt = block.timestamp;
    }

    /// @notice Owner menarik BNB hasil paid mint.
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // --- Override wajib karena ERC721 + ERC721Enumerable ---
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
