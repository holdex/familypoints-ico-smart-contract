const AffiliateSystem = artifacts.require('AffiliateSystem.sol');
const FamilyPointsToken = artifacts.require('FamilyPointsToken.sol');
const BonusStrategy = artifacts.require('BonusStrategy.sol');
const PricingStrategy = artifacts.require('PricingStrategy.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');
const FinalizeAgent = artifacts.require('FinalizeAgent.sol');

module.exports = async function (deployer) {
    const wallet = "YOUR WALLET ADDRESS GOES HERE";

    deployer.deploy(CrowdSale,
        FamilyPointsToken.address,
        PricingStrategy.address,
        BonusStrategy.address,
        90 * 24 * 3600, // 90 days
        wallet
    );

    deployer.link(CrowdSale, FinalizeAgent);
};
