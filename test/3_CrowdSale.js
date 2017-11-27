const FamilyPointsToken = artifacts.require('FamilyPointsToken.sol');
const BonusStrategy = artifacts.require('BonusStrategy.sol');
const PricingStrategy = artifacts.require('PricingStrategy.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');
const AffiliateSystem = artifacts.require('AffiliateSystem.sol');
const FinalizeAgent = artifacts.require('FinalizeAgent.sol');
const web3 = CrowdSale.web3;

const expectThrow = require('./helpers/expectThrow');
const getParamFromTransactionEvent = require('./helpers/getParamFromTxEvent');
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
    return FinalizeAgent.new(token, crowdSale);
}

contract('CrowdSale', function (accounts) {
    let crowdSaleInstance;
    let tokenInstance;
    let pricingStrategyInstance;
    let bonusStrategyInstance;
    let finalizeAgentInstance;

    const owner = accounts[0];
    const investor = accounts[1];

    //Convert string representation of uuid to the bytes
    let investorUuidBytes = Buffer.alloc(16);
    uuidParse.parse('fca5c40a-3db7-47d8-a8ea-d58e0b11a448', investorUuidBytes);
    investorUuidBytes = '0x' + investorUuidBytes.toString('hex');

    const leader = accounts[2];

    //Convert string representation of uuid to the bytes
    let leaderUuidBytes = Buffer.alloc(16);
    uuidParse.parse("5ea8193c-bbe5-4018-847f-ae716a6ceef9", leaderUuidBytes);
    leaderUuidBytes = '0x' + leaderUuidBytes.toString('hex');

    const wallet = accounts[5];

    const tokenDecimals = 18;
    const ether = web3.toBigNumber(web3.toWei(1, 'ether'));
    const defaultTokenPrice = ether.div(100);

    /** A total tokens cap for the CrowdSale. A 65% from the total issue (225M) with 18 token decimals */
    const tokenTotalPurchaseCap = web3.toBigNumber('1.4625e26');

    const stageBonusPercent = 30;
    const leaderBonusPercent = 4;
    const followerBonusPercent = 5;

    beforeEach(async () => {
        tokenInstance = await deployToken();
        pricingStrategyInstance = await deployPricingStrategy(defaultTokenPrice);
        bonusStrategyInstance = await deployBonusStrategy();

        await bonusStrategyInstance.setStageBonus(stageBonusPercent);
        await bonusStrategyInstance.setLeaderBonus(leaderBonusPercent);
        await bonusStrategyInstance.setFollowerBonus(followerBonusPercent);
        await bonusStrategyInstance.setSpecificBonusSegment(0, ether, ether.mul(2), 15);

        crowdSaleInstance = await deployCrowdSaleTest(
            tokenInstance.address,
            pricingStrategyInstance.address,
            bonusStrategyInstance.address,
            wallet
        );

        finalizeAgentInstance = await deployFinalizeAgent(tokenInstance.address, crowdSaleInstance.address);

        //Approve owner tokens
        const tokensToApprove = await crowdSaleInstance.tokenTotalPurchaseCap();
        //Approve owner tokens for transfer by CrowdSale
        await tokenInstance.approve(crowdSaleInstance.address, tokensToApprove, {from: owner});

        //Allow finalize agent to burn tokens
        await tokenInstance.approve(finalizeAgentInstance.address, tokenTotalPurchaseCap, {from: owner});
        tokenInstance.allowAddress(finalizeAgentInstance.address, true);

        //Set the finalize agent in crowdsale
        await crowdSaleInstance.setFinalizeAgent(finalizeAgentInstance.address);

        assert.ok(crowdSaleInstance);
    });

    it('Check tokens total purchase cap', async function() {
        try {
            assert.equal(
                tokenTotalPurchaseCap.toString(),
                (await crowdSaleInstance.tokenTotalPurchaseCap()).toString()
            );

            assert.equal(
                tokenTotalPurchaseCap.toString(),
                (await crowdSaleInstance.getAvailableTokensToSell()).toString()
            );
        } catch(err) {
            assert(false, err.message);
        }
    });

    it('Invest tokens with bonus with zero token purchase cap with zero minimal investment', async function () {
        try {
            //Will get 100 tokens for 1 ether
            const baseTokenAmount  = await pricingStrategyInstance.calculateTokenAmount(ether, tokenDecimals);
            const bonusTokenAmount = await bonusStrategyInstance.calculateCommonBonus(baseTokenAmount, ether);
            const initialWalletBalance = web3.eth.getBalance(wallet);

            //Give 1 ether. Should get 100 tokens + bonus.
            const tokensReceiver = getParamFromTransactionEvent(
                await crowdSaleInstance.invest(leader, investorUuidBytes, {from: investor, value: ether}),
                '_investor',
                null,
                'Invested'
            );

            //Event was fired
            assert.equal(
                investor,
                tokensReceiver
            );

            //Allowed tokens to sell was decreased
            assert.equal(
                tokenTotalPurchaseCap.minus(baseTokenAmount).minus(bonusTokenAmount).toString(),
                (await crowdSaleInstance.getAvailableTokensToSell()).toString()
            );

            //Tokens was sent
            assert.equal(
                (await tokenInstance.balanceOf(investor)).toString(),
                baseTokenAmount.plus(bonusTokenAmount).toString()
            );

            //Ether was received by wallet from the investor
            assert.equal(
                initialWalletBalance.add(ether).toString(),
                (await web3.eth.getBalance(wallet)).toString()
            );

            //Check crowdsale uuid public mappings
            assert.equal(
                (await crowdSaleInstance.tokenAmountOfAccount(investorUuidBytes)).toString(),
                baseTokenAmount.toString()
            );

            assert.equal(
                (await crowdSaleInstance.investedAmountOfAccount(investorUuidBytes)).toString(),
                ether.toString()
            );

            assert.equal(
                (await crowdSaleInstance.tokenBonusSentOfAccount(investorUuidBytes)).toString(),
                bonusTokenAmount.toString()
            );
        } catch(err) {
            assert(false, err.message)
        }
    });


    it('Could not invest if value is less that minimum investment', async function () {
        try {
            //Minimal investment now 2 ether
            await crowdSaleInstance.setMinimalInvestmentInWei(ether.mul('2'));

            expectThrow(
                crowdSaleInstance.invest(leader, investorUuidBytes, {from: investor, value: ether})
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Exception when trying to change minimal investment from non-owner', async function () {
        try {
            expectThrow(
                crowdSaleInstance.setMinimalInvestmentInWei(ether.mul('2'), {from: investor})
            )
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Invest tokens with bonus and token purchase cap defined with minimal investment in 0.9 ether', async function () {
        try {
            await crowdSaleInstance.setMinimalInvestmentInWei(ether.mul('0.9'));

            //Purchase cap is 100 tokens
            const tokensPurchaseCap = web3.toBigNumber('1e20');
            await crowdSaleInstance.setTokenPurchaseCap(tokensPurchaseCap);
            //Will get 100 tokens for 1 ether
            const baseTokenAmount  = await pricingStrategyInstance.calculateTokenAmount(ether, tokenDecimals);
            const bonusTokenAmount = await bonusStrategyInstance.calculateCommonBonus(baseTokenAmount, ether);
            const initialWalletBalance = web3.eth.getBalance(wallet);

            //Give 1 ether. Should get 100 tokens + bonus.
            const tokensReceiver = getParamFromTransactionEvent(
                await crowdSaleInstance.invest(leader, investorUuidBytes, {from: investor, value: ether}),
                '_investor',
                null,
                'Invested'
            );

            //Event was fired
            assert.equal(
                investor,
                tokensReceiver
            );

            //Allowed tokens to sell was decreased
            assert.equal(
                tokenTotalPurchaseCap.minus(baseTokenAmount).minus(bonusTokenAmount).toString(),
                (await crowdSaleInstance.getAvailableTokensToSell()).toString()
            );

            //Tokens was sent
            assert.equal(
                (await tokenInstance.balanceOf(investor)).toString(),
                baseTokenAmount.plus(bonusTokenAmount).toString()
            );

            //Ether was received by wallet from the investor
            assert.equal(
                initialWalletBalance.add(ether).toString(),
                (await web3.eth.getBalance(wallet)).toString()
            );

            //Check crowdsale uuid public mappings
            assert.equal(
                (await crowdSaleInstance.tokenAmountOfAccount(investorUuidBytes)).toString(),
                baseTokenAmount.toString()
            );

            assert.equal(
                (await crowdSaleInstance.investedAmountOfAccount(investorUuidBytes)).toString(),
                ether.toString()
            );

            assert.equal(
                (await crowdSaleInstance.tokenBonusSentOfAccount(investorUuidBytes)).toString(),
                bonusTokenAmount.toString()
            );
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Invest tokens with leader program when leader has not invested before and cap set with zero minimal investment', async function() {
        try {
            //Setup the leader system
            const affiliateSystemInstance = await deployAffiliate();
            await crowdSaleInstance.setAffiliateSystem(affiliateSystemInstance.address);
            await affiliateSystemInstance.allowAddress(crowdSaleInstance.address, true);

            //Purchase cap is 100 tokens
            const tokensPurchaseCap = web3.toBigNumber('1e20');
            await crowdSaleInstance.setTokenPurchaseCap(tokensPurchaseCap);

            //Will get 100 tokens for 1 ether
            const baseTokenAmount  = await pricingStrategyInstance.calculateTokenAmount(ether, tokenDecimals);

            //Get only stage bonus
            const bonusTokenAmount = await bonusStrategyInstance.calculateCommonBonus(baseTokenAmount, ether);

            const initialWalletBalance = web3.eth.getBalance(wallet);

            //Give 1 ether. Should get 100 tokens + bonus.
            const tokensReceiver = getParamFromTransactionEvent(
                await crowdSaleInstance.invest(leader, investorUuidBytes, {from: investor, value: ether}),
                '_investor',
                null,
                'Invested'
            );

            //Event was fired
            assert.equal(
                investor,
                tokensReceiver
            );

            //Allowed tokens to sell was decreased
            assert.equal(
                tokenTotalPurchaseCap.minus(baseTokenAmount).minus(bonusTokenAmount).toString(),
                (await crowdSaleInstance.getAvailableTokensToSell()).toString()
            );

            //Tokens was sent
            assert.equal(
                (await tokenInstance.balanceOf(investor)).toString(),
                baseTokenAmount.plus(bonusTokenAmount).toString()
            );

            //Ether was received by wallet from the investor
            assert.equal(
                initialWalletBalance.add(ether).toString(),
                (await web3.eth.getBalance(wallet)).toString()
            );

            //Check crowdsale uuid public mappings
            assert.equal(
                (await crowdSaleInstance.tokenAmountOfAccount(investorUuidBytes)).toString(),
                baseTokenAmount.toString()
            );

            assert.equal(
                (await crowdSaleInstance.investedAmountOfAccount(investorUuidBytes)).toString(),
                ether.toString()
            );

            assert.equal(
                (await crowdSaleInstance.tokenBonusSentOfAccount(investorUuidBytes)).toString(),
                bonusTokenAmount.toString()
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Invest tokens with leader when leader made investment before program and cap set with minimal investment in 0.9 ether', async function() {
        try {
            await crowdSaleInstance.setMinimalInvestmentInWei(ether.mul('0.9'));

            //Setup the leader system
            const affiliateSystemInstance = await deployAffiliate();
            await crowdSaleInstance.setAffiliateSystem(affiliateSystemInstance.address);
            await affiliateSystemInstance.allowAddress(crowdSaleInstance.address, true);

            //Affiliate should make investment first
            await crowdSaleInstance.invest("0x00", leaderUuidBytes, {from: leader, value: ether});

            //Purchase cap is 200 tokens
            const tokensPurchaseCap = web3.toBigNumber('2e20');
            await crowdSaleInstance.setTokenPurchaseCap(tokensPurchaseCap);

            //Will get 100 tokens for 1 ether
            const baseTokenAmount  = await pricingStrategyInstance.calculateTokenAmount(ether, tokenDecimals);

            let bonusTokenAmount = await bonusStrategyInstance.calculateCommonBonus(baseTokenAmount, ether);
            bonusTokenAmount = bonusTokenAmount.plus(
                await bonusStrategyInstance.calculateFollowerBonus(baseTokenAmount)
            );

            const leaderBonusTokensAmount = await bonusStrategyInstance.calculateLeaderBonus(baseTokenAmount);

            const initialWalletBalance = web3.eth.getBalance(wallet);
            const leaderInitialTokensBalance = await tokenInstance.balanceOf(leader);

            //Give 1 ether. Should get 100 tokens + bonus.
            const tokensReceiver = getParamFromTransactionEvent(
                await crowdSaleInstance.invest(leader, investorUuidBytes, {from: investor, value: ether}),
                '_investor',
                null,
                'Invested'
            );

            //Event was fired
            assert.equal(
                investor,
                tokensReceiver
            );

            //Allowed tokens to sell was decreased
            assert.equal(
                tokenTotalPurchaseCap
                    .minus(baseTokenAmount)
                    .minus(bonusTokenAmount)
                    .minus(leaderBonusTokensAmount)
                    .minus(leaderInitialTokensBalance)
                    .toString(),
                (await crowdSaleInstance.getAvailableTokensToSell()).toString()
            );

            //Tokens was sent
            assert.equal(
                (await tokenInstance.balanceOf(investor)).toString(),
                baseTokenAmount.plus(bonusTokenAmount).toString()
            );

            //Ether was received by wallet from the investor
            assert.equal(
                initialWalletBalance.add(ether).toString(),
                (await web3.eth.getBalance(wallet)).toString()
            );

            //Affiliate got tokens for the peer
            assert.equal(
                leaderInitialTokensBalance.plus(leaderBonusTokensAmount).toString(),
                (await tokenInstance.balanceOf(leader)).toString()
            )
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Exception when trying to break token purchase cap', async function () {
        try {
            //Purchase cap is 10 tokens
            const tokensPurchaseCap = web3.toBigNumber('1e19');
            await crowdSaleInstance.setTokenPurchaseCap(tokensPurchaseCap);

            expectThrow(
                crowdSaleInstance.invest(leader, investorUuidBytes, {from: investor, value: ether})
            );
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Exception when trying to break token total purchase cap', async function () {
        try {
            const tokenPrice = ether.div('10000000');
            const pricingStrategyInstance = await deployPricingStrategy(tokenPrice);

            await crowdSaleInstance.setPricingStrategy(pricingStrategyInstance.address);
            await bonusStrategyInstance.setStageBonus(0);

            //42 ether to invest
            const etherToInvest = ether.mul('42');

            expectThrow(
                crowdSaleInstance.invest(leader, investorUuidBytes, {from: investor, value: etherToInvest})
            );
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Exception when trying to send zero ether', async function () {
        try {
            expectThrow(
                crowdSaleInstance.invest(leader ,investorUuidBytes, {from: investor, value: 0})
            );
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Set new wallet address', async function () {
        try {
            await crowdSaleInstance.setWallet(accounts[6], {from: owner});
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Exception when trying to set empty wallet', async function () {
        try {
            expectThrow(
                crowdSaleInstance.setWallet(0x0, {from: owner})
            )
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Set the new PricingStrategy', async function () {
        try {
            const newPricingStrategy = await deployPricingStrategy(ether.div(1000));
            await crowdSaleInstance.setPricingStrategy(newPricingStrategy.address, {from: owner});
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Exception when trying to set a non-PricingStrategy', async function() {
        try {
            expectThrow(
                crowdSaleInstance.setPricingStrategy(accounts[6], {from: owner})
            );
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Set the new BonusStrategy', async function () {
        try {
            const newBonusStrategy = await deployBonusStrategy();
            await crowdSaleInstance.setBonusStrategy(newBonusStrategy.address, {from: owner});
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Exception when trying to set a non-BonusStrategy', async function() {
        try {
            expectThrow(
                crowdSaleInstance.setBonusStrategy(accounts[6], {from: owner})
            )
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Exception when set the new PricingStrategy by the non-owner', async function () {
        try {
            const newPricingStrategy = await deployPricingStrategy(ether.div(1000));
            expectThrow(
                crowdSaleInstance.setPricingStrategy(newPricingStrategy.address, {from: accounts[6]})
            );
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Exception when set the new BonusStrategy by the non-owner', async function () {
        try {
            const newBonusStrategy = await deployBonusStrategy();
            expectThrow(
                crowdSaleInstance.setBonusStrategy(newBonusStrategy.address, {from: accounts[6]})
            )
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Exception when set the new wallet by the non-owner', async function () {
        try {
            expectThrow(
                crowdSaleInstance.setWallet(accounts[6], {from: accounts[6]})
            )
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Check finalize method', async function () {
        try {
            await crowdSaleInstance.finalize();

            assert.notEqual(
                (await crowdSaleInstance.finalizedTimestamp()).toString(),
                '0'
            );

            assert.isTrue(
                await crowdSaleInstance.isFinalized()
            );

            expectThrow(
                crowdSaleInstance.finalize()
            )
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Exception when trying to call finalize from non-owner address', async function() {
        try {
            expectThrow(
                crowdSaleInstance.finalize({from: accounts[6]})
            )
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Set the new FinalizeAgent', async function () {
        try {
            const newFinalizeAgent = await deployFinalizeAgent(tokenInstance.address, crowdSaleInstance.address);
            await crowdSaleInstance.setFinalizeAgent(newFinalizeAgent.address);
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Exception when trying to set the new FinalizeAgent from non-owner address', async function () {
        try {
            const newFinalizeAgent = await deployFinalizeAgent(tokenInstance.address, crowdSaleInstance.address);
            expectThrow(
                crowdSaleInstance.setFinalizeAgent(newFinalizeAgent.address, {from: accounts[6]})
            );
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Exception when set the new tokens purchase cap by the non-owner', async function () {
        try {
            expectThrow(
                crowdSaleInstance.setTokenPurchaseCap(0, {from: accounts[6]})
            )
        } catch(err) {
            assert(false, err.message)
        }
    });
});
