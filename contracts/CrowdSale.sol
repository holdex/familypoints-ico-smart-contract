pragma solidity 0.4.15;


import "./interfaces/PricingStrategyInterface.sol";
import "./interfaces/BonusStrategyInterface.sol";
import "./interfaces/AffiliateSystemInterface.sol";
import "./interfaces/CrowdSaleInterface.sol";
import "./interfaces/TokenInterface.sol";
import "./interfaces/FinalizeAgentInterface.sol";
import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Claimable.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";


contract CrowdSale is CrowdSaleInterface, Pausable, Claimable, HasNoEther {
    using SafeMath for uint256;

    TokenInterface public token;

    PricingStrategyInterface public pricingStrategy;

    BonusStrategyInterface public bonusStrategy;

    AffiliateSystemInterface public affiliateSystem;

    FinalizeAgentInterface public finalizeAgent;

    bool public isFinalized = false;

    uint256 public finalizedTimestamp;

    bool isAffiliateSystemSet = false;

    address public wallet;

    uint256 public weiRaised = 0;

    uint256 public tokensSold = 0;

    uint256 public tokensBonusSent = 0;

    uint256 public investorCount = 0;

    /** Invested by users. */
    mapping (address => uint256) public investedAmountOf;

    /** Invested by users uuid4 */
    mapping (bytes16 => uint256) public investedAmountOfAccount;

    /** Tokens by users. */
    mapping (address => uint256) public tokenAmountOf;

    /** Tokens by users uuid4 */
    mapping (bytes16 => uint256) public tokenAmountOfAccount;

    /** Bonus tokens got by user. */
    mapping (address => uint256) public tokenBonusSentOf;

    /** Bonus tokens got by user uuid4.  */
    mapping (bytes16 => uint256) public tokenBonusSentOfAccount;

    /** Mapping of the address and uuid4 of investor. */
    mapping (address => bytes16) public accountAddress;

    /** Tokens cap for every stage */
    uint256 public tokenStagePurchaseCap = 0;

    /** A total tokens cap for the CrowdSale. A 65% from the total issue (500M) with 18 token decimals */
    uint256 public tokenTotalPurchaseCap = 325000000 * 10 ** 18;

    /** A minimal value to invest in WEI. Applied only when greater than zero/ */
    uint256 public minimalInvestmentInWei = 0;

    /** A new investment was made */
    event Invested(address indexed _investor, bytes16 indexed accountId, uint256 _weiAmount, uint256 _tokenAmount, uint256 _tokenBonus);

    /**
     * @dev CrowdSale constructor
     */
    function CrowdSale(TokenInterface _token, PricingStrategyInterface _pricingStrategy, BonusStrategyInterface _bonusStrategy, address _wallet) {
        token = _token;
        setPricingStrategy(_pricingStrategy);
        setBonusStrategy(_bonusStrategy);
        setWallet(_wallet);
    }

    /**
     * @dev Is purchase is valid
     */
    modifier validPurchase() {
        require(msg.value > 0);
        require(!isFinalized);

        if (minimalInvestmentInWei > 0) {
            require(msg.value >= minimalInvestmentInWei);
        }
        _;
    }

    /**
     * @dev Main function where investors should call to make a funding
     * @param _leader Address of the leader. Zero leader should be 0x00
     * @param _accountId uuid4 unique value of the investor
     */
    function invest(address _leader, bytes16 _accountId) validPurchase whenNotPaused public payable {
        /** _accountId is not empty */
        require(_accountId[0] != 0);

        uint256 weiAmount = msg.value;
        address receiver = msg.sender;

        /** Link address and account id */
        accountAddress[receiver] = _accountId;

        uint256 baseTokenAmount = pricingStrategy.calculateTokenAmount(weiAmount, token.decimals());

        require(baseTokenAmount > 0);
        require(isNotReachedTokensTotalPurchaseCap(baseTokenAmount));
        require(isNotReachedTokenStagePurchaseCap(baseTokenAmount));

        uint256 tokenBonus = calculateBonus(baseTokenAmount, weiAmount, _leader);

        if (investedAmountOf[receiver] == 0) {
            // A new investor
            investorCount++;
        }

        // Update investor counters.
        investedAmountOf[receiver] = investedAmountOf[receiver].add(weiAmount);
        tokenAmountOf[receiver] = tokenAmountOf[receiver].add(baseTokenAmount);
        tokenBonusSentOf[receiver] = tokenBonusSentOf[receiver].add(tokenBonus);

        //Update investor uuid4 counter
        investedAmountOfAccount[_accountId] = investedAmountOfAccount[_accountId].add(weiAmount);
        tokenAmountOfAccount[_accountId] = tokenAmountOfAccount[_accountId].add(baseTokenAmount);
        tokenBonusSentOfAccount[_accountId] = tokenBonusSentOfAccount[_accountId].add(tokenBonus);

        // Update total counters
        weiRaised = weiRaised.add(weiAmount);
        tokensSold = tokensSold.add(baseTokenAmount);
        tokensBonusSent = tokensBonusSent.add(tokenBonus);

        //Assign tokens
        assignTokens(receiver, baseTokenAmount, tokenBonus);

        //Send ether to RefundVault
        forwardFunds(weiAmount);

        //Send bonus for peer to the leader and register the leader peer
        sendLeaderBonus(baseTokenAmount, _leader);

        //Register follower if not registered
        registerFollower(_leader, receiver);

        //Register investor as leader if was not registered before
        registerLeader(receiver);

        // Tell us invest was success
        Invested(receiver, _accountId, weiAmount, baseTokenAmount, tokenBonus);
    }

    /**
     * @dev Set the specified stage tokens stage cap
     * @param _tokenPurchaseCap Tokens purchase cap. If you want to disable cap - just set zero
     */
    function setTokenPurchaseCap(uint256 _tokenPurchaseCap) onlyOwner external {
        tokenStagePurchaseCap = _tokenPurchaseCap;
    }

    /**
     * @dev Allow to change pricing strategy by the owner
     */
    function setPricingStrategy(PricingStrategyInterface _pricingStrategy) onlyOwner public {
        pricingStrategy = _pricingStrategy;
        require(pricingStrategy.isPricingStrategy());
    }

    /**
     * @dev Allow to change bonus strategy by the owner
     */
    function setBonusStrategy(BonusStrategyInterface _bonusStrategy) onlyOwner public {
        bonusStrategy = _bonusStrategy;
        require(bonusStrategy.isBonusStrategy());
    }

    /**
     * @dev Allow to change affiliate system by the owner
     */
    function setAffiliateSystem(AffiliateSystemInterface _affiliateSystem) onlyOwner public {
        affiliateSystem = _affiliateSystem;
        require(affiliateSystem.isAffiliateSystem());
        isAffiliateSystemSet = true;
    }

    /**
     * @dev Allow to set and change finalize agent by the owner
     */
    function setFinalizeAgent(FinalizeAgentInterface _finalizeAgent) onlyOwner public {
        finalizeAgent = _finalizeAgent;
        require(finalizeAgent.isFinalizeAgent());
    }

    /**
     * @dev Set wallet or address to receive ether
     */
    function setWallet(address _wallet) onlyOwner public {
        require(_wallet != 0x00);
        wallet = _wallet;
    }

    /**
     * @dev Finalize the CrowdSale and burn all rest tokens from the pool
     */
    function finalize() onlyOwner public {
        require(!isFinalized);

        finalizeAgent.finalize();
        isFinalized = true;
        finalizedTimestamp = now;
    }

    /**
     * @dev Set a minimal value in wei. Set zero to reset.
     */
    function setMinimalInvestmentInWei(uint256 _wei) onlyOwner public {
        minimalInvestmentInWei = _wei;
    }

    /**
    * @dev Could we sell passed amount of tokens at passed stage
    */
    function isNotReachedTokenStagePurchaseCap(uint256 _tokensAmount) public constant returns (bool) {
        return tokenStagePurchaseCap == 0 || tokensSold.add(_tokensAmount) <= tokenStagePurchaseCap;
    }

    /**
     * @dev Could we sell passed amount of tokens
     */
    function isNotReachedTokensTotalPurchaseCap(uint256 _tokensAmount) public constant returns (bool) {
        return _tokensAmount <= getAvailableTokensToSell();
    }

    /**
     * @dev Calculating available tokens to spend by the crowdsale
     */
    function getAvailableTokensToSell() public constant returns (uint256) {
        return tokenTotalPurchaseCap - tokensSold - tokensBonusSent;
    }

    /**
     * @dev Wrapper function for calculating of total bonus for investor
     */
    function calculateBonus(uint256 _baseTokensAmount, uint256 _weiAmount, address _leader) public constant returns (uint256 total) {
        total = bonusStrategy.calculateCommonBonus(_baseTokensAmount, _weiAmount);
        if (isLeader(_leader)) {
            total = total.add(bonusStrategy.calculateFollowerBonus(_baseTokensAmount));
        }
    }

    /**
     * @dev Send bonus for peer investor
     */
    function sendLeaderBonus(uint256 _baseTokensAmount, address _leader) internal {
        if (isLeader(_leader)) {
            uint256 leaderBonus = bonusStrategy.calculateLeaderBonus(_baseTokensAmount);

            //Update counters
            tokensBonusSent = tokensBonusSent.add(leaderBonus);
            tokenBonusSentOf[_leader] = tokenBonusSentOf[_leader].add(leaderBonus);

            token.transferFrom(owner, _leader, leaderBonus);
        }
    }

    /**
     * @dev Wrapper for checking leader
     */
    function isLeader(address _leader) internal constant returns (bool) {
        return isAffiliateSystemSet && affiliateSystem.isLeader(_leader);
    }

    /**
     * @dev Wrapper for register leader
     */
    function registerLeader(address _investor) internal {
        if (isAffiliateSystemSet) {
            affiliateSystem.registerLeader(_investor);
        }
    }

    /**
     * @dev Wrapper for adding follower
     */
    function registerFollower(address _leader, address _receiver) internal {
        if (isLeader(_leader)) {
            affiliateSystem.registerFollower(_leader, _receiver);
        }
    }

    /**
     * @dev Forward invested fund to refund vault
     */
    function forwardFunds(uint256 _weiAmount) internal {
        wallet.transfer(_weiAmount);
    }

    /**
     * @dev Assign tokens to the investor
     */
    function assignTokens(address _receiver, uint256 _tokenAmount, uint256 _tokenBonusAmount) internal {
        token.transferFrom(owner, _receiver, _tokenAmount.add(_tokenBonusAmount));
    }
}
