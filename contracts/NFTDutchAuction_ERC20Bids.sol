pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NFTDutchAuction_ERC20Bids {
    address payable public auctionOwner;
    address public erc721TokenAddress;
    address public erc20TokenAddress;
    uint256 public nftTokenId;
    uint256 public reservePrice;
    uint256 public numBlocksAuctionOpen;
    uint256 public offerPriceDecrement;
    uint256 public auctionEndTime;
    uint256 public currentPrice;
    address public winningBidder;
    bool public auctionEnded;

    modifier onlyAuctionOwner() {
        require(msg.sender == auctionOwner, "Only auction owner can perform this action");
        _;
    }

    modifier auctionOpen() {
        require(!auctionEnded, "Auction has ended");
        require(block.number <= auctionEndTime, "Auction has expired");
        _;
    }

    constructor(
        address _erc20TokenAddress,
        address _erc721TokenAddress,
        uint256 _nftTokenId,
        uint256 _reservePrice,
        uint256 _numBlocksAuctionOpen,
        uint256 _offerPriceDecrement
    ) {
        auctionOwner = payable(msg.sender);
        erc20TokenAddress = _erc20TokenAddress;
        erc721TokenAddress = _erc721TokenAddress;
        nftTokenId = _nftTokenId;
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        auctionEndTime = block.number + _numBlocksAuctionOpen;
        currentPrice = _calculateInitialPrice();
    }

    function placeBid(uint256 _bidAmount) external auctionOpen {
        require(_bidAmount >= currentPrice, "Bid amount is lower than the current price");

        if (winningBidder != address(0)) {
            // Refund the previous winning bidder
            IERC20(erc20TokenAddress).transfer(winningBidder, currentPrice);
        }

        IERC20(erc20TokenAddress).transferFrom(msg.sender, address(this), _bidAmount);

        winningBidder = msg.sender;
        currentPrice -= offerPriceDecrement;
    }

    function endAuction() external onlyAuctionOwner auctionOpen {
        auctionEnded = true;

        // Transfer the NFT to the winning bidder
        ERC721(erc721TokenAddress).transferFrom(address(this), winningBidder, nftTokenId);

        // Transfer the remaining ERC20 tokens to the auction owner
        uint256 remainingBalance = IERC20(erc20TokenAddress).balanceOf(address(this));
        IERC20(erc20TokenAddress).transfer(auctionOwner, remainingBalance);
    }

    function _calculateInitialPrice() private view returns (uint256) {
        return reservePrice + numBlocksAuctionOpen * offerPriceDecrement;
    }
}
