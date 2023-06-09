const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTDutchAuction_ERC20Bids", function () {
  let nftDutchAuction;
  let erc721Token;
  let erc20Token;
  let nftTokenId;
  let reservePrice;
  let numBlocksAuctionOpen;
  let offerPriceDecrement;
  let auctionOwner;
  let bidder1;
  let bidder2;
  let winningBid;

  beforeEach(async () => {
    [auctionOwner, bidder1, bidder2] = await ethers.getSigners();

    const ERC721Token = await ethers.getContractFactory("ERC721Token");
    erc721Token = await ERC721Token.deploy();
    await erc721Token.deployed();

    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    erc20Token = await ERC20Token.deploy();
    await erc20Token.deployed();

    const NFTDutchAuction_ERC20Bids = await ethers.getContractFactory("NFTDutchAuction_ERC20Bids");
    nftDutchAuction = await NFTDutchAuction_ERC20Bids.deploy(
      erc20Token.address,
      erc721Token.address,
      nftTokenId,
      reservePrice,
      numBlocksAuctionOpen,
      offerPriceDecrement
    );
    await nftDutchAuction.deployed();

    // Mint an NFT to be auctioned
    await erc721Token.mint(auctionOwner.address, nftTokenId);
  });

  it("should start the auction with the correct parameters", async function () {
    expect(await nftDutchAuction.auctionOwner()).to.equal(auctionOwner.address);
    expect(await nftDutchAuction.erc721TokenAddress()).to.equal(erc721Token.address);
    expect(await nftDutchAuction.erc20TokenAddress()).to.equal(erc20Token.address);
    expect(await nftDutchAuction.nftTokenId()).to.equal(nftTokenId);
    expect(await nftDutchAuction.reservePrice()).to.equal(reservePrice);
    expect(await nftDutchAuction.numBlocksAuctionOpen()).to.equal(numBlocksAuctionOpen);
    expect(await nftDutchAuction.offerPriceDecrement()).to.equal(offerPriceDecrement);
    expect(await nftDutchAuction.currentPrice()).to.equal(reservePrice + numBlocksAuctionOpen * offerPriceDecrement);
  });

  it("should allow bidders to place ERC20 token bids", async function () {
    await erc20Token.mint(bidder1.address, reservePrice);
    await erc20Token.connect(bidder1).approve(nftDutchAuction.address, reservePrice);
    await nftDutchAuction.connect(bidder1).placeBid(reservePrice);

    await erc20Token.mint(bidder2.address, reservePrice + offerPriceDecrement);
    await erc20Token.connect(bidder2).approve(nftDutchAuction.address, reservePrice + offerPriceDecrement);
    await nftDutchAuction.connect(bidder2).placeBid(reservePrice + offerPriceDecrement);

    expect(await nftDutchAuction.winningBidder()).to.equal(bidder2.address);
    expect(await nftDutchAuction.currentPrice()).to.equal(reservePrice);
  });

  it("should end the auction and transfer the NFT and remaining ERC20 tokens to the winning bidder and owner, respectively", async function () {
    winningBid = reservePrice + offerPriceDecrement;

    await erc20Token.mint(bidder1.address, reservePrice);
    await erc20Token.connect(bidder1).approve(nftDutchAuction.address, reservePrice);
    await nftDutchAuction.connect(bidder1).placeBid(reservePrice);

    await erc20Token.mint(bidder2.address, winningBid);
    await erc20Token.connect(bidder2).approve(nftDutchAuction.address, winningBid);
    await nftDutchAuction.connect(bidder2).placeBid(winningBid);

    const ownerBalanceBefore = await erc20Token.balanceOf(auctionOwner.address);
    const bidderBalanceBefore = await erc20Token.balanceOf(bidder2.address);

    await nftDutchAuction.connect(auctionOwner).endAuction();

    const ownerBalanceAfter = await erc20Token.balanceOf(auctionOwner.address);
    const bidderBalanceAfter = await erc20Token.balanceOf(bidder2.address);

    expect(await nftDutchAuction.auctionEnded()).to.be.true;
    expect(await erc721Token.ownerOf(nftTokenId)).to.equal(bidder2.address);
    expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(0); // No remaining ERC20 tokens
    expect(bidderBalanceAfter.sub(bidderBalanceBefore)).to.equal(reservePrice);
  });
});
