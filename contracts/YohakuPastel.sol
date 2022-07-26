// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YohakuPastel is ERC721A("YohakuPastel", "YHK"), Ownable {
    error BeforeMint();
    error MintReachedMaxSupply();
    error MintReachedMaxMintAmount();
    error MintReachedWhiteListMaxMintAmount();
    error MintAmountIsInvalid();

    enum Phase {
        BeforeMint,
        WLMint,
        PublicMint
    }

    address public constant withdrawAddress =
        0xDb40277dd6B3d4f0971A982f9fE9Fd5D96905E0e;
    Phase public phase = Phase.BeforeMint;

    uint256 public maxSupply = 1000;
    uint256 public maxMintAmount = 5;
    uint256 public whiteListMaxMintAmount = 10;
    uint256 public whiteListCount = 0;

    mapping(address => uint256) public whiteList;
    mapping(address => uint256) public whiteListMintedAmount;

    string public baseURI =
        "ipfs://QmRJmwpNnDmdMxki9hbGrR8UzKEDRXYhr4tEdfmGuHWuRp/";
    string public baseExtension = ".json";

    constructor() {
        _safeMint(withdrawAddress, 30);
    }

    function whiteListMint(uint256 _mintAmount) external payable {
        if (phase != Phase.WLMint) revert BeforeMint();
        if (_mintAmount == 0) revert MintAmountIsInvalid();
        if (totalSupply() + _mintAmount > maxSupply)
            revert MintReachedMaxSupply();
        if (
            whiteListMintedAmount[_msgSender()] + _mintAmount >
            whiteList[_msgSender()]
        ) revert MintReachedWhiteListMaxMintAmount();

        whiteListMintedAmount[_msgSender()] += _mintAmount;
        _safeMint(msg.sender, _mintAmount);
    }

    function mint(uint256 _mintAmount) public payable {
        if (phase != Phase.PublicMint) revert BeforeMint();
        if (_mintAmount == 0) revert MintAmountIsInvalid();
        if (_mintAmount > maxMintAmount) revert MintAmountIsInvalid();
        if (totalSupply() + _mintAmount > maxSupply)
            revert MintReachedMaxSupply();

        _safeMint(msg.sender, _mintAmount);
    }

    function setWhiteList(address[] memory addr) public onlyOwner {
        for (uint256 i = 0; i < addr.length; i++) {
            whiteListCount = whiteListCount + whiteListMaxMintAmount;
            whiteList[addr[i]] = whiteListMaxMintAmount;
        }
    }

    function deleteWhiteList(address addr) public virtual onlyOwner {
        whiteListCount = whiteListCount - whiteList[addr];
        delete (whiteList[addr]);
    }

    function setPhase(Phase _phase) public onlyOwner {
        phase = _phase;
    }

    function setMaxMintAmount(uint256 _newAmount) public onlyOwner {
        maxMintAmount = _newAmount;
    }

    function setWhiteListMaxMintAmount(uint256 _newAmount) public onlyOwner {
        whiteListMaxMintAmount = _newAmount;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setBaseExtension(string memory _newBaseExtension)
        public
        onlyOwner
    {
        baseExtension = _newBaseExtension;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        return
            string(abi.encodePacked(ERC721A.tokenURI(tokenId), baseExtension));
    }

    function getWhiteListCountOfOwner(address owner)
        public
        view
        returns (uint256)
    {
        return whiteList[owner];
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }
}
