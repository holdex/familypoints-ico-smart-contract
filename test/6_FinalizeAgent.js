const FamilyPointsToken = artifacts.require('FamilyPointsToken.sol');
const BonusStrategy = artifacts.require('BonusStrategy.sol');
const PricingStrategy = artifacts.require('PricingStrategy.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');
const AffiliateSystem = artifacts.require('AffiliateSystem.sol');
const FinalizeAgentTest = artifacts.require('FinalizeAgentTest.sol');
const web3 = CrowdSale.web3;

const expectThrow = require('./helpers/expectThrow');
const uuidParse = require('uuid-parse');

async function deployCrowdSaleTest(token, pricingStrategy, bonusStrategy, walletAddress) {
    return CrowdSale.new(token, pricingStrategy, bonusStrategy, walletAddress);
}

async function deployPricingStrategy(tokenPrice) {
    return PricingStrategy.new(tokenPrice)
}

async function deployBonusStrategy() {
    return BonusStrategy.new();
}

async function deployToken() {
    return FamilyPointsToken.new();
}

async function deployAffiliate() {
    return AffiliateSystem.new();
}

async function deployFinalizeAgent(token, crowdSale) {
    return FinalizeAgentTest.new(token, crowdSale);
}

contract('FinalizeAgentTest', function (accounts) {
    let crowdSaleInstance;
    let tokenInstance;
    let pricingStrategyInstance;
    let bonusStrategyInstance;
    let finalizeAgentInstance;

    const owner = accounts[0];
    const investor = accounts[1];

    const tokenDecimals = 18;

    //Convert string representation of uuid to the bytes
    let investorUuidBytes = Buffer.alloc(16);
    uuidParse.parse('fca5c40a-3db7-47d8-a8ea-d58e0b11a448', investorUuidBytes);
    investorUuidBytes = '0x' + investorUuidBytes.toString('hex');

    const wallet = accounts[5];

    const ether = web3.toBigNumber(web3.toWei(1, 'ether'));
    const defaultTokenPrice = ether.div(100);

    let tokenTotalPurchaseCap;

    beforeEach(async () => {
        tokenInstance = await deployToken();
        pricingStrategyInstance = await deployPricingStrategy(defaultTokenPrice);
        bonusStrategyInstance = await deployBonusStrategy();

        crowdSaleInstance = await deployCrowdSaleTest(
            tokenInstance.address,
            pricingStrategyInstance.address,
            bonusStrategyInstance.address,
            wallet
        );

        //Approve owner tokens
        tokenTotalPurchaseCap = await crowdSaleInstance.tokenTotalPurchaseCap();

        //Approve owner tokens for transfer by CrowdSale
        await tokenInstance.approve(crowdSaleInstance.address, tokenTotalPurchaseCap, {from: owner});

        finalizeAgentInstance = await deployFinalizeAgent(tokenInstance.address, crowdSaleInstance.address);
        //Allow finalize agent to burn tokens
        await tokenInstance.approve(finalizeAgentInstance.address, tokenTotalPurchaseCap, {from: owner});
        tokenInstance.allowAddress(finalizeAgentInstance.address, true);

        assert.ok(finalizeAgentInstance);
    });

    it('Check main finalize method', async function () {
        try {
            const initialOwnerBalance = await tokenInstance.balanceOf(owner);

            //Will get 100 tokens for 1 ether
            const baseTokenAmount = await pricingStrategyInstance.calculateTokenAmount(ether, tokenDecimals);
            const bonusTokenAmount = await bonusStrategyInstance.calculateStageBonus(baseTokenAmount);

            const tokensWillNotBeBurned = baseTokenAmount.add(bonusTokenAmount);

            //Give 1 ether. Should get 100 tokens which will not be burned
            await crowdSaleInstance.invest('0x00', investorUuidBytes, {from: investor, value: ether});

            await finalizeAgentInstance.finalize();

            assert.equal(
                (await tokenInstance.balanceOf(owner)).sub(tokensWillNotBeBurned).toString(),
                initialOwnerBalance.sub(tokenTotalPurchaseCap).toString()
            );

            assert.equal(
                (await crowdSaleInstance.tokenAmountOf(investor)).add(await crowdSaleInstance.tokenBonusSentOf(investor)).toString(),
                tokensWillNotBeBurned.toString()
            );
        } catch (err) {
            assert(false, err.message);
        }
    });
});
