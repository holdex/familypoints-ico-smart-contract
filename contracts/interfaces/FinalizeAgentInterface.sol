pragma solidity 0.4.15;

contract FinalizeAgentInterface {
    function isFinalizeAgent() public constant returns(bool);
    function finalize() public;
}
