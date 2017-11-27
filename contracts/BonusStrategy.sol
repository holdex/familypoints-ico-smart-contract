pragma solidity 0.4.15;


import "../node_modules/zeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Claimable.sol";
import "./interfaces/BonusStrategyInterface.sol";


contract BonusStrategy is BonusStrategyInterface, HasNoEther, Claimable {
    struct SpecificBonus {
        uint256 fromAmountWei;
        uint256 toAmountWei;
        uint16 bonusPercent;
    }

    uint8 public constant maxBonusesCount = 10;

    SpecificBonus[10] public bonusesList;

    uint16 public stageBonus;

    uint16 public followerBonus;

    uint16 public leaderBonus;

    /**
     * @dev Interface method for checking pricing strategy. Should implement calculateBonus method
     */
    function isBonusStrategy() public constant returns (bool) {
        return true;
    }

    /**
     * @dev Calculate specific bonus or fallback to stage bonus, if specific bonus is zero
     */
    function calculateCommonBonus(uint256 _initialTokensAmount, uint256 _weiAmount) public constant returns (uint256 bonusTokens) {
        bonusTokens = calculateSpecificBonus(_initialTokensAmount, _weiAmount);
        if (bonusTokens == 0) {
            bonusTokens = calculateStageBonus(_initialTokensAmount);
        }
    }

    /**
     * @dev Calculate specific bonus based on wei (ether) sent
     * @param _initialTokensAmount Tokens bought by investor
     * @param _weiAmount Wei sent by investor
     */
    function calculateSpecificBonus(uint256 _initialTokensAmount, uint256 _weiAmount) public constant returns (uint256 bonusTokens) {
        for (uint8 i = 0; i < maxBonusesCount; i++) {
            if (_weiAmount >= bonusesList[i].fromAmountWei && _weiAmount < bonusesList[i].toAmountWei) {
                bonusTokens = _initialTokensAmount * bonusesList[i].bonusPercent / 100;
                break;
            }
        }
    }

    /**
     * @dev Calculates stage bonus based on sent tokens amount
     * @param _initialTokensAmount Tokens bought by investor
     */
    function calculateStageBonus(uint256 _initialTokensAmount) public constant returns (uint256) {
        if (stageBonus > 0) {
            return _initialTokensAmount * stageBonus / 100;
        }

        return 0;
    }

    /**
     * @dev Calculates follower bonus based on sent tokens amount
     * @param _initialTokensAmount Tokens bought by investor
     */
    function calculateFollowerBonus(uint256 _initialTokensAmount) public constant returns (uint256) {
        if (followerBonus > 0) {
            return _initialTokensAmount * followerBonus / 100;
        }

        return 0;
    }

    /**
     * @dev Calculates leader bonus based on sent tokens amount
     * @param _followerTokensAmount Tokens bought by the follower
     */
    function calculateLeaderBonus(uint256 _followerTokensAmount) public constant returns (uint256) {
        if (leaderBonus > 0) {
            return _followerTokensAmount * leaderBonus / 100;
        }
        return 0;
    }

    /**
     * @dev Get specific bonus by index.
     * @param _index Numeric index of the specific bonus fragment
     */
    function getSpecificBonusSegment(uint8 _index) public constant returns (uint256, uint256, uint16) {
        require(_index < maxBonusesCount);

        return (
        bonusesList[_index].fromAmountWei,
        bonusesList[_index].toAmountWei,
        bonusesList[_index].bonusPercent
        );
    }

    /**
     * @dev Set bonus for specific amount of investment send
     * @param _index of the bonus segment. Between 0 and 9
     * @param _fromAmountWei Starting value of the bonus segment. Investment should be greater or equal that this param
     * @param _toAmountWei Ending value of the bonus segment. Investment should be less that this param
     * @param _bonusPercent Bonus in percents for the investment.
     */
    function setSpecificBonusSegment(uint8 _index, uint256 _fromAmountWei, uint256 _toAmountWei, uint16 _bonusPercent) onlyOwner external {
        require(_index < maxBonusesCount);
        require(_fromAmountWei < _toAmountWei);

        bonusesList[_index].fromAmountWei = _fromAmountWei;
        bonusesList[_index].toAmountWei = _toAmountWei;
        bonusesList[_index].bonusPercent = _bonusPercent;
    }

    /**
     * Delete all specific bonuses. Common bonus will be the stage bonus only.
     */
    function resetSpecificBonuses() onlyOwner external {
        delete bonusesList;
    }

    /**
     * @dev Set the bonus for follower. If zero - no bonus will be calculated.
     * @param _followerBonus Follower peer bonus in percents. Should be an integer number
     */
    function setFollowerBonus(uint16 _followerBonus) onlyOwner external {
        followerBonus = _followerBonus;
    }

    /**
     * @dev Set bonus for the leader. If zero - no bonus will be calculated.
     * @param _leaderBonus Leader bonus in percents. Should be an integer number
     */
    function setLeaderBonus(uint16 _leaderBonus) onlyOwner external {
        leaderBonus = _leaderBonus;
    }

    /**
     * @dev Set stage common bonus for all investors. If zero - no bonus will be calculated.
     * @param _bonus Stage bonus in percents. Should be an integer number
     */
    function setStageBonus(uint16 _bonus) onlyOwner external {
        stageBonus = _bonus;
    }
}
