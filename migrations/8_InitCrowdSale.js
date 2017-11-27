const AffiliateSystem = artifacts.require('AffiliateSystem.sol');
const FamilyPointsToken = artifacts.require('FamilyPointsToken.sol');
const BonusStrategy = artifacts.require('BonusStrategy.sol');
const PricingStrategy = artifacts.require('PricingStrategy.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');
const FinalizeAgent = artifacts.require('FinalizeAgent.sol');

module.exports = async function (deployer) {
    let tokenInstance = await FamilyPointsToken.deployed();
    const owner = await tokenInstance.owner();

    let crowdSaleInstance = await CrowdSale.deployed();
    let affiliateSystemInstance = await AffiliateSystem.deployed();

    //Set affiliate system contract and provide allowance for crowdsale to manipulate the affiliate system
    await crowdSaleInstance.setAffiliateSystem(AffiliateSystem.address);
    await affiliateSystemInstance.allowAddress(CrowdSale.address, true);

    /** Get tokens total supply. We've setting static tokens purchase cap and allow this cap for managing by the
     *  adn the 
     * */
    const tokensToApprove = await crowdSaleInstance.tokenTotalPurchaseCap();
    //Approve owner tokens for transfer by CrowdSale
    await tokenInstance.approve(CrowdSale.address, tokensToApprove, {from: owner});

    //Prepare and setup finalize agent
    await tokenInstance.approve(FinalizeAgent.address, tokensToApprove, {from: owner});
    //Allow FinalizeAgent to burn the tokens
    await tokenInstance.allowAddress(FinalizeAgent.address, true, {from: owner});

    await crowdSaleInstance.setFinalizeAgent(FinalizeAgent.address);
};
