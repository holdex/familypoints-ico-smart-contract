pragma solidity 0.4.19;


import "./interfaces/FinalizeAgentInterface.sol";
import "./interfaces/CrowdSaleInterface.sol";
import "./interfaces/TokenInterface.sol";


contract FinalizeAgent is FinalizeAgentInterface {
    TokenInterface public token;
    CrowdSaleInterface public crowdSale;

    modifier onlyCrowdSale() {
        require(msg.sender == address(crowdSale));
        _;
    }

    function FinalizeAgent(TokenInterface _token, CrowdSaleInterface _crowdSale) {
        token = _token;
        crowdSale = _crowdSale;
    }

    /**
     * @dev Interface method for checking finalize agent
     */
    function isFinalizeAgent() public constant returns (bool) {
        return true;
    }

    /**
     * @dev The main method will ba called in finalize() method in the CrowdSale
     */
    function finalize() onlyCrowdSale public {
        address owner = token.owner();
        //We are burning all available CrowdSale tokens
        uint256 tokensToBurn = crowdSale.getAvailableTokensToSell();
        //Burn tokens from the main pool
        token.burnFrom(owner, tokensToBurn);
    }
}
