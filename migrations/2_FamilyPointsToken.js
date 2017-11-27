const FamilyPointsToken = artifacts.require('FamilyPointsToken.sol');
const FinalizeAgent = artifacts.require('FinalizeAgent.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');

module.exports = async function (deployer) {
    deployer.deploy(FamilyPointsToken);
    deployer.link(FamilyPointsToken, CrowdSale);
    deployer.link(FamilyPointsToken, FinalizeAgent);
};
