const BonusStrategy = artifacts.require('BonusStrategy.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');

module.exports = async function (deployer) {
    deployer.deploy(BonusStrategy);
    deployer.link(BonusStrategy, CrowdSale);
};
