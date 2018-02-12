pragma solidity 0.4.19;


import "./FinalizeAgent.sol";


/**
 * Contract for testing purposes only
 */
contract FinalizeAgentTest is FinalizeAgent {

    function FinalizeAgentTest(TokenInterface _token, CrowdSaleInterface _crowdSale)
    FinalizeAgent(_token, _crowdSale) {}

    /**
     * @dev Redefined modifier without conditions
     */
    modifier onlyCrowdSale() {
        _;
    }
}
