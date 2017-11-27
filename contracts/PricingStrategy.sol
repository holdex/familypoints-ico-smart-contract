pragma solidity 0.4.15;


import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Claimable.sol";
import "./interfaces/PricingStrategyInterface.sol";


contract PricingStrategy is PricingStrategyInterface, Claimable, HasNoEther {
    using SafeMath for uint256;

    /** Default token price in wei */
    uint256 public oneTokenInWei;

    event Deployed(address _owner, uint256 _oneTokenInWei);
    event TokenPriceChanged(address _owner, uint256 _oneTokenInWei);

    /**
     * @dev Setup pricing strategy and set token price
     */
    function PricingStrategy(uint256 _oneTokenInWei) {
        require(_oneTokenInWei > 0);
        oneTokenInWei = _oneTokenInWei;
        Deployed(msg.sender, _oneTokenInWei);
    }

    /**
     * @dev Interface method for checking pricing strategy
     */
    function isPricingStrategy() public constant returns (bool) {
        return true;
    }

    /**
     * @dev Calculate the current token amount for sent wei.
     * @param _weiSent Count wei sent
     * @param _decimals Count of decimals of the token
     * @return Amount of tokens for send wei
     */
    function calculateTokenAmount(uint256 _weiSent, uint256 _decimals) public constant returns (uint256 tokens)
    {
        uint256 multiplier = 10 ** _decimals;
        tokens = _weiSent.mul(multiplier) / oneTokenInWei;
    }

    /**
     * @dev Change token price by owner
     */
    function setOneTokenInWei(uint256 _oneTokenInWei) public onlyOwner {
        oneTokenInWei = _oneTokenInWei;
        TokenPriceChanged(msg.sender, _oneTokenInWei);
    }
}
