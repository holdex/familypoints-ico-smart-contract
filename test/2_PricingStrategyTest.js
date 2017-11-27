const PricingStrategy = artifacts.require('PricingStrategy.sol');
const web3 = PricingStrategy.web3;

const expectThrow = require('./helpers/expectThrow');

async function deployStrategy(tokenPrice) {
    return PricingStrategy.new(tokenPrice);
}

contract('PricingStrategy', function (accounts) {
    let instance;

    const owner = accounts[0];
    const TOKEN_DECIMALS = 18;
    const ether = web3.toBigNumber(web3.toWei(1, 'ether'));
    const defaultTokenPrice = ether.div(100);

    beforeEach(async () => {
        /** 100 tokens for 1 ether */
        instance = await deployStrategy(defaultTokenPrice);
        assert.ok(instance);
    });

    it('Check default token price', async function () {
        try {
            assert.deepEqual(
                await instance.oneTokenInWei.call(),
                defaultTokenPrice
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Check calculation of price', async function () {
        try {
            /** Send wei amount for the 1 token */
            const weiToSend = web3.toBigNumber(web3.toWei(1, 'ether')).div(100);
            /** One token received with 18 decimals */
            let tokensReceived = web3.toBigNumber('1e18');

            assert.deepEqual(
                await instance.calculateTokenAmount(weiToSend, TOKEN_DECIMALS),
                tokensReceived
            );

            /** Set the new price for 1 token. 1000 tokens for 1 Ether */
            await instance.setOneTokenInWei(ether.div(1000), {from: owner});
            /** Ten tokens received with 18 decimals for the same amount of Wei */
            tokensReceived = web3.toBigNumber('1e19');

            assert.deepEqual(
                await instance.calculateTokenAmount(weiToSend, TOKEN_DECIMALS),
                tokensReceived
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Get exception when trying to set price by non-owner', async function () {
        try {
            expectThrow(
                instance.setOneTokenInWei(ether.div(1000), {from: accounts[2]})
            )
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Check pricing strategy interface', async function () {
        try {
            assert.isTrue(await instance.isPricingStrategy());
        } catch (err) {
            assert(false, err.message)
        }
    })
});
