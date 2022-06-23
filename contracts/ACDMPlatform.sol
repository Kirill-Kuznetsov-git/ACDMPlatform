//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ERC20/InterfaceERC20.sol";

contract ACDMPlatform {
    enum RoundType { SELL, TRADE }

    address public owner;

    // 5%
    uint public firstReferralSell = 5;
    // 3%
    uint public secondReferralSell = 3;
    // 2.5%
    uint public referralTrade = 25;

    mapping(address => bool) public isDAO;
    
    uint constant public durationRound = 3 days;
    Round public currectRound;
    uint public charity;
    // price of one ACDM wei in ETH wei
    uint public currectPrice;
    uint public numberToken;
    // trading volume
    uint public tradeValue;
    InterfaceERC20 private token;
    InterfaceERC20 private tokenCharity;
    mapping(address => User) private users;

    // account address to value of trade(acdm wei tokens)
    mapping(address => Trade) private trades;

    struct Round {
        RoundType round;
        uint startAt;
    }

    struct User {
        bool registrated;
        address referralFirst;
        address referralSecond;
    }

    struct Trade {
        uint numberWeiToken;
        uint priceOneWeiToken;
    }

    modifier SellRound(){
        require(currectRound.round == RoundType.SELL, "not sell round");
        require(currectRound.startAt + durationRound <= block.timestamp, "round already ended");
        _;
    }

    modifier TradeRound(){
        require(currectRound.round == RoundType.TRADE, "not trade round");
        require(currectRound.startAt + durationRound <= block.timestamp, "round already ended");
        _;
    }

    modifier OnlyDAO(){
        require(isDAO[msg.sender], "not DAO");
        _;
    }

    constructor(InterfaceERC20 _token, InterfaceERC20 _tokenCharity){
        owner = msg.sender;
        tokenCharity = _tokenCharity;
        token = _token;
        numberToken = 100000 * (10 ** token.decimals());
        currectPrice = 10 ** 7 wei;
        currectRound.round = RoundType.SELL;
        currectRound.startAt = block.timestamp;
        tradeValue = 0;
        charity = 0;
        updateRound();
    }

    function registration(address referralFirst, address referralSecond) public {
        require(referralFirst == address(0) || users[referralFirst].registrated, "first referral not registrated");
        require(referralSecond == address(0) || users[referralSecond].registrated, "second referral not registrated");
        users[msg.sender].registrated = true;
        if (referralFirst == address(0) && referralSecond != address(0)){
            referralFirst = referralSecond;
            referralSecond = address(0);
        }
        users[msg.sender].referralFirst = referralFirst;
        users[msg.sender].referralSecond = referralSecond;
    }

    function buyToken(uint amount) public payable SellRound{
        require(msg.value >= amount * currectPrice, "not enough funds");
        uint actualAmount = min(amount, token.balanceOf(address(this)));
        uint refund = msg.value - currectPrice * actualAmount;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
        if (users[msg.sender].referralFirst != address(0)){
            payable(users[msg.sender].referralFirst).transfer((msg.value - refund) * firstReferralSell / 100);
        }
        if (users[msg.sender].referralSecond != address(0)){
            payable(users[msg.sender].referralSecond).transfer((msg.value - refund) * secondReferralSell / 100);
        }
        numberToken -= actualAmount;
        token.transfer(msg.sender, actualAmount);
        if (numberToken == 0){
            updateRound();
        }
    }

    function setTrade(uint numberWeiToken, uint priceOneWeiToken) public TradeRound{
        require(token.balanceOf(msg.sender) >= numberWeiToken, "not enough tokens");
        token.transferFrom(msg.sender, address(this), numberWeiToken);
        trades[msg.sender].priceOneWeiToken = priceOneWeiToken;
        trades[msg.sender].numberWeiToken += numberWeiToken;
    }

    function closeTrade() public TradeRound{
        uint numberTokenClose = trades[msg.sender].numberWeiToken;
        trades[msg.sender].numberWeiToken = 0;
        token.transfer(msg.sender, numberTokenClose);
    }

    function buyTrade(address seller, uint numberWeiToken) public payable TradeRound{
        require(trades[seller].numberWeiToken >= numberWeiToken, "not enough tokens");
        uint actualNumberWeiToken = min(numberWeiToken, msg.value / trades[seller].priceOneWeiToken);
        uint refund = msg.value - actualNumberWeiToken * trades[seller].priceOneWeiToken;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
        tradeValue += msg.value - refund;
        token.transfer(msg.sender, actualNumberWeiToken);
        uint payed = (msg.value - refund) * 95 / 100;
        payable(seller).transfer((msg.value - refund) * 95 / 100);
        if (users[msg.sender].referralFirst != address(0)) {
            payable(users[msg.sender].referralFirst).transfer((msg.value - refund) * referralTrade / 1000);
            payed += (msg.value - refund) * referralTrade / 1000;
        }
        if (users[msg.sender].referralSecond != address(0)) {
            payable(users[msg.sender].referralSecond).transfer((msg.value - refund) * referralTrade / 1000);
            payed += (msg.value - refund) * referralTrade / 1000;
        }
        charity += msg.value - payed;
    }

    function updateRound() public {
        require(currectRound.startAt + durationRound <= block.timestamp, "not ended yet");
        if (currectRound.round == RoundType.TRADE) {
            if (tradeValue == 0) {
                currectRound.startAt = block.timestamp;
            } else {
                currectRound.round = RoundType.SELL;
                currectRound.startAt = block.timestamp;
                currectPrice = currectPrice * 103 / 100 + 4;
                token.mint(address(this), tradeValue / currectPrice * token.decimals());
            }
        } else {
            token.burn(address(this), numberToken);
            currectRound.round = RoundType.TRADE;
            currectRound.startAt = block.timestamp;
        }
    }

    function changeFirstReferralSell(uint newFirstReferralSell) public OnlyDAO {
        firstReferralSell = newFirstReferralSell;
    }

    function changeSecondReferralSell(uint newSecondReferralSell) public OnlyDAO {
        secondReferralSell = newSecondReferralSell;
    }

    function changeReferralTrade(uint newReferralTrade) public OnlyDAO {
        referralTrade = newReferralTrade;
    }
    
    // 0 means give it to owner
    // 1 means but XXX token
    function spendCharity(uint res) public OnlyDAO {
        require(res == 0 || res == 1, "wrong value");
        if (res == 0) {
            payable(owner).transfer(charity);
        }
        if (res == 1) {
            // buy XXX token
            tokenCharity.burn(address(this), tokenCharity.balanceOf(address(this)));
        }
        charity = 0;
    }

    function min(uint a, uint b) internal pure returns(uint){
        if (a <= b) {
            return a;
        } else{
            return b;
        }
    }
}
