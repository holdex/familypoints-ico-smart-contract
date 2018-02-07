pragma solidity 0.4.15;


import "./library/OnlyAllowedAddresses.sol";
import "./interfaces/TokenInterface.sol";
import "../node_modules/zeppelin-solidity/contracts/token/StandardToken.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Claimable.sol";


contract FamilyPointsToken is TokenInterface, StandardToken, OnlyAllowedAddresses, HasNoEther, Claimable {
    event Burn(address indexed tokensOwner, address indexed burner, uint256 value);

    function FamilyPointsToken() {
        totalSupply = uint256(500 * 10 ** (6 + 18));
        balances[msg.sender] = totalSupply;
    }

    function name() public constant returns (string) {
        return "FamilyPoints Token";
    }

    function symbol() public constant returns (string) {
        return "FPT";
    }

    function decimals() public constant returns (uint256) {
        return uint256(18);
    }

    /**
     * @dev Burns a specific amount of tokens. Updated version of the BurnableToken methods from OpenZeppelin 1.3.0
     * @param _tokensToBurn The amount of token to be burned.
     */
    function burnFrom(address _tokensOwner, uint256 _tokensToBurn) onlyAllowedAddresses public {
        require(_tokensToBurn > 0);

        address burner = msg.sender;

        //If we are not own this tokens we should be checked for allowance
        if (_tokensOwner != burner) {
            uint256 allowedTokens = allowance(_tokensOwner, burner);
            require(allowedTokens >= _tokensToBurn);
        }

        balances[_tokensOwner] = balances[_tokensOwner].sub(_tokensToBurn);
        totalSupply = totalSupply.sub(_tokensToBurn);
        Burn(_tokensOwner, burner, _tokensToBurn);
    }
}
