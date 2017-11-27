pragma solidity 0.4.15;


contract BonusStrategyInterface {
    function isBonusStrategy() public constant returns (bool);

    function calculateStageBonus(uint256 _initialTokensAmount) public constant returns (uint256);

    function calculateFollowerBonus(uint256 _initialTokensAmount) public constant returns (uint256);

    function calculateLeaderBonus(uint256 _followerTokensAmount) public constant returns (uint256);

    function calculateSpecificBonus(uint256 _initialTokensAmount, uint256 _weiAmount) public constant returns (uint256 bonusTokens);

    function calculateCommonBonus(uint256 _initialTokensAmount, uint256 _weiAmount) public constant returns (uint256 bonusTokens);
}
