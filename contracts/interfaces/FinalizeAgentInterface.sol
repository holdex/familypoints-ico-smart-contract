pragma solidity 0.4.19;

contract FinalizeAgentInterface {
    function isFinalizeAgent() public constant returns(bool);
    function finalize() public;
}
