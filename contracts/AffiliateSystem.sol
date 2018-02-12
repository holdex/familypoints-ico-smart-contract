pragma solidity 0.4.19;


import "./interfaces/AffiliateSystemInterface.sol";
import "./library/OnlyAllowedAddresses.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Claimable.sol";


contract AffiliateSystem is AffiliateSystemInterface, OnlyAllowedAddresses, Claimable {
    struct Leader {
        /** Indicator value. False by default. Should be set as true when adding affiliate */
        bool isLeader;
        /** Total list of follower. Should be updated together with mapping (address => bool) isFollower */
        address[] followers;
        /** Total list of followers for easy and fast checking user address. Should be updated together with address[] followers */
        mapping (address => bool) isFollower;
    }

    /** Total list of leaders and related followers */
    mapping (address => Leader) public leaderList;

    event LeaderRegistered(address indexed _leader, address indexed _sender);

    event FollowerRegistered(address indexed _follower, address indexed _leader);

    /**
     * @dev Interface method for checking pricing strategy
     */
    function isAffiliateSystem() public constant returns (bool) {
        return true;
    }

    /**
     * @dev Main public method for checking is address was registered leader
     */
    function isLeader(address _leader) public constant returns (bool) {
        return leaderList[_leader].isLeader;
    }

    /**
     * @dev Add follower for a leader if a leader was registered
     */
    function registerFollower(address _leader, address _follower) onlyAllowedAddresses public {
        if (isLeader(_leader) && _follower != 0x00 && !leaderList[_leader].isFollower[_follower]) {
            /** We are keeping array and mapping both for easily checking pf peer address and for
             *  keeping the ability to return list of the followers via Web3. We can't return the mapping directly via RPC
             */
            leaderList[_leader].followers.push(_follower);
            leaderList[_leader].isFollower[_follower] = true;
            FollowerRegistered(_follower, _leader);
        }
    }

    /**
     * @dev Register sent address as leader
     */
    function registerLeader(address _leader) onlyAllowedAddresses public {
        if (_leader != 0x00 && !leaderList[_leader].isLeader) {
            leaderList[_leader].isLeader = true;
            LeaderRegistered(_leader, msg.sender);
        }
    }

    /**
     * @dev Get addresses of leader followers or throw if leader not exists
     */
    function getFollowers(address _leader) external constant returns (address[]) {
        require(isLeader(_leader));
        return leaderList[_leader].followers;
    }
}
