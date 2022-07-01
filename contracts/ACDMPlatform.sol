//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./uniswap/IUniswapV2Router02.sol";
import "./ERC20/InterfaceERC20.sol";
import "./interfaces/IDAO.sol";

contract ACDMPlatform {
    enum RoundType { SELL, TRADE }

    address public owner;
    address public wethAddress;
    IUniswapV2Router02 public uniswapV2Router;

    // 5%
    uint public firstReferralSell;
    // 3%
    uint public secondReferralSell;
    // 2.5%
    uint public referralTrade;
    
    Round public currentRound;
    uint public charity;
    // price of one ACDM wei in ETH wei
    uint public currectPrice;
    uint public numberToken;
    // trading volume
    uint public tradeValue;
    InterfaceERC20 private token;
    InterfaceERC20 private tokenCharity;
    IDAO private dao;
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
        require(currentRound.round == RoundType.SELL, "not sell round");
        require(currentRound.startAt + 3 days >= block.timestamp, "round already ended");
        _;
    }

    modifier TradeRound(){
        require(currentRound.round == RoundType.TRADE, "not trade round");
        require(currentRound.startAt + 3 days >= block.timestamp, "round already ended");
        _;
    }

    modifier onlyRegistrated() {
        require(users[msg.sender].registrated, "not registrated");
        _;
    }

    modifier onlyOwner(){
        require(msg.sender == owner, "not an owner");
        _;
    }

    modifier onlyDAO(){
        require(msg.sender == address(dao), "not DAO");
        _;
    }

    constructor(InterfaceERC20 _token, InterfaceERC20 _tokenCharity, IUniswapV2Router02 _uniswapV2Router, address _wethAddress){
        firstReferralSell = 5;
        secondReferralSell = 3;
        referralTrade = 25;
        wethAddress = _wethAddress;
        owner = msg.sender;
        uniswapV2Router = _uniswapV2Router;
        tokenCharity = _tokenCharity;
        token = _token;
    }

    function DURATIONROUND() external pure returns(uint256) {
        return 3 days;
    }

    function startPatform() external onlyOwner {
        numberToken = 100000 * (10 ** token.decimals());
        token.mint(address(this), numberToken);
        currectPrice = 10 ** 7 wei;
        currentRound.round = RoundType.SELL;
        currentRound.startAt = block.timestamp;
        tradeValue = 0;
        charity = 0;
    }

    function setDAO(IDAO _dao) public onlyOwner {
        require(address(dao) == address(0), "already set");
        dao = _dao;
    }

    function registration(address referralFirst, address referralSecond) public {
        require(!users[msg.sender].registrated, "already registrated");
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

    function buyToken(uint amount) public payable SellRound onlyRegistrated{
        require(msg.value >= amount * currectPrice, "not enough funds");
        uint actualAmount = min(amount, numberToken);
        uint refund = msg.value - currectPrice * actualAmount;
        numberToken -= actualAmount;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
        if (users[msg.sender].referralFirst != address(0)){
            payable(users[msg.sender].referralFirst).transfer((msg.value - refund) * firstReferralSell / 100);
        }
        if (users[msg.sender].referralSecond != address(0)){
            payable(users[msg.sender].referralSecond).transfer((msg.value - refund) * secondReferralSell / 100);
        }
        token.transfer(msg.sender, actualAmount);
        if (numberToken == 0){
            updateRound();
        }
    }

    function setTrade(uint numberWeiToken, uint priceOneWeiToken) public TradeRound onlyRegistrated{
        require(token.balanceOf(msg.sender) >= numberWeiToken, "not enough tokens");
        token.transferFrom(msg.sender, address(this), numberWeiToken);
        trades[msg.sender].priceOneWeiToken = priceOneWeiToken;
        trades[msg.sender].numberWeiToken += numberWeiToken;
    }

    function closeTrade() public TradeRound onlyRegistrated{
        uint numberTokenClose = trades[msg.sender].numberWeiToken;
        trades[msg.sender].numberWeiToken = 0;
        token.transfer(msg.sender, numberTokenClose);
    }

    function buyTrade(address seller, uint numberWeiToken) public payable TradeRound onlyRegistrated{
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
        if (users[seller].referralFirst != address(0)) {
            payable(users[seller].referralFirst).transfer((msg.value - refund) * referralTrade / 1000);
            payed += (msg.value - refund) * referralTrade / 1000;
        }
        if (users[seller].referralSecond != address(0)) {
            payable(users[seller].referralSecond).transfer((msg.value - refund) * referralTrade / 1000);
            payed += (msg.value - refund) * referralTrade / 1000;
        }
        charity += msg.value - payed;
    }

    function updateRound() public onlyRegistrated{
        require(currentRound.startAt + 3 days <= block.timestamp || (currentRound.round == RoundType.SELL && numberToken == 0), "not ended yet");
        if (currentRound.round == RoundType.TRADE) {
            if (tradeValue == 0) {
                currentRound.startAt = block.timestamp;
            } else {
                currentRound.round = RoundType.SELL;
                currentRound.startAt = block.timestamp;
                tradeValue = 0;
                currectPrice = currectPrice * 103 / 100 + 4;
                numberToken = tradeValue / currectPrice * token.decimals();
                token.mint(address(this), tradeValue / currectPrice * token.decimals());
            }
        } else {
            token.burn(address(this), numberToken);
            currentRound.round = RoundType.TRADE;
            currentRound.startAt = block.timestamp;
        }
    }

    function changeFirstReferralSell(uint newFirstReferralSell) public onlyDAO {
        firstReferralSell = newFirstReferralSell;
    }

    function changeSecondReferralSell(uint newSecondReferralSell) public onlyDAO {
        secondReferralSell = newSecondReferralSell;
    }

    function changeReferralTrade(uint newReferralTrade) public onlyDAO {
        referralTrade = newReferralTrade;
    }
    
    // 0 means give it to owner
    // 1 means buy and burn XXX token
    function spendCharity(uint256 res) public onlyDAO {
        require(res == 0 || res == 1, "wrong value");
        if (res == 0) {
            payable(owner).transfer(charity);
        } else {
            address[] memory pair = new address[](2);
            pair[0] = wethAddress;
            pair[1] = address(tokenCharity);
            uint256[] memory actualAmount = uniswapV2Router.getAmountsOut(charity, pair);
            IUniswapV2Router02(uniswapV2Router).swapExactETHForTokens{ value: charity }( 
                actualAmount[1],
                pair,
                msg.sender,
                block.timestamp
            );
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
