const AffiliateSystem = artifacts.require('AffiliateSystem.sol');
const FamilyPointsToken = artifacts.require('FamilyPointsToken.sol');
const BonusStrategy = artifacts.require('BonusStrategy.sol');
const PricingStrategy = artifacts.require('PricingStrategy.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');
const FinalizeAgent = artifacts.require('FinalizeAgent.sol');

module.exports = async function (deployer) {
    const wallet = "";

    deployer.deploy(CrowdSale,
        FamilyPointsToken.address,
        PricingStrategy.address,
        BonusStrategy.address,
        wallet
    );

    deployer.link(CrowdSale, FinalizeAgent);
};
