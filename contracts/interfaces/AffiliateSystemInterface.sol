pragma solidity 0.4.19;


contract AffiliateSystemInterface {
    function isAffiliateSystem() public constant returns (bool);

    function isLeader(address _leader) public constant returns (bool);

    function registerFollower(address _leader, address _follower) public;

    function registerLeader(address _leader) public;
}
