pragma solidity 0.4.19;


import "../../node_modules/zeppelin-solidity/contracts/token/ERC20.sol";


contract TokenInterface is ERC20 {
    address public owner;

    function name() public constant returns (string);

    function symbol() public constant returns (string);

    function decimals() public constant returns (uint256);

    event Burn(address indexed tokensOwner, address indexed burner, uint256 value);

    function burnFrom(address _tokensOwner, uint256 _tokensToBurn) public;
}
