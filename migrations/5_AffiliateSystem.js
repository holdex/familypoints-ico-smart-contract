const AffiliateSystem = artifacts.require('AffiliateSystem.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');

module.exports = async function (deployer) {
    deployer.deploy(AffiliateSystem);
    deployer.link(AffiliateSystem, CrowdSale);
};
