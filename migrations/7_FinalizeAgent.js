const FinalizeAgent = artifacts.require('FinalizeAgent.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');
const FamilyPointsToken = artifacts.require('FamilyPointsToken.sol');

module.exports = async function (deployer) {
    deployer.deploy(FinalizeAgent, FamilyPointsToken.address, CrowdSale.address);
};
