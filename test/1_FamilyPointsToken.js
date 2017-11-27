const FamilyPointsToken = artifacts.require('FamilyPointsToken.sol');
const web3 = FamilyPointsToken.web3;

const expectThrow = require('./helpers/expectThrow');

const TOKEN_NAME = 'FamilyPoints Token';
const TOKEN_SYMBOL = 'FPT';
const INITIAL_SUPPLY = web3.toBigNumber('2.25e26');
const DECIMALS = web3.toBigNumber('18');

async function deployToken() {
    return FamilyPointsToken.new();
}

contract('FamilyPointsToken', function (accounts) {
    let instance;
    const owner = accounts[0];
    const whitelistedUser = accounts[1];

    beforeEach(async () => {
        instance = await deployToken();
        assert.ok(instance);
    });

    it('Check token properties', async function () {
        try {
            assert.deepEqual(
                (await instance.totalSupply.call()),
                INITIAL_SUPPLY
            );

            assert.deepEqual(
                (await instance.decimals.call()),
                DECIMALS
            );

            assert.equal((await instance.name.call()), TOKEN_NAME);
            assert.equal((await instance.symbol.call()), TOKEN_SYMBOL);
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Check that tokens can be transfered', async function () {
        try {
            await instance.transfer(accounts[2], web3.toBigNumber('100'), {from: owner});
            const recipientBalance = await instance.balanceOf.call(accounts[2]);
            const senderBalance = await instance.balanceOf.call(owner);

            assert.deepEqual(recipientBalance, web3.toBigNumber('100'));
            assert.deepEqual(senderBalance, INITIAL_SUPPLY.minus('100'));
        } catch (err) {
            assert(false, err.message);
        }

    });

    // transfer()
    it('Check that account can not transfer more tokens then have', async function () {
        try {
            await instance.transfer(accounts[2], 100, {from: owner});

            expectThrow(
                instance.transfer(accounts[3], 102, {from: accounts[2]})
            )
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Check account balance', async function () {
        try {
            await instance.transfer(accounts[2], 100, {from: owner});
            const recepientBalance = await instance.balanceOf.call(accounts[2]);
            assert.equal(recepientBalance.c[0], 100);
        } catch (err) {
            assert(false, err.message);
        }
    });

    // transferFrom()
    it('Check that account can transfer approved tokens', async function () {
        try {
            await instance.transfer(accounts[1], 100, {from: owner});
            await instance.approve(accounts[2], 50, {from: accounts[1]});
            await instance.transferFrom(accounts[1], accounts[3], 50, {from: accounts[2]});
            const recepientBalance = await instance.balanceOf.call(accounts[3]);
            assert.equal(recepientBalance.c[0], 50);
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Check that tokens can be approved', async function () {
        try {
            const tokensForApprove = 666;
            assert.ok(
                await instance.approve(accounts[3], tokensForApprove, {from: owner})
            );
        } catch (err) {
            assert(false, err.message);
        }
    });

    // balanceOf()
    it('Check balance of owner account', async function () {
        try {
            const balance = await instance.balanceOf.call(owner);
            assert.equal(balance.valueOf(), INITIAL_SUPPLY);
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Check that account can not transfer unapproved tokens', async function () {
        try {
            const expectedBalance = 66;

            expectThrow(
                instance.transferFrom(owner, accounts[2], expectedBalance, {from: accounts[1]})
            )
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Check that approved tokens are allowed', async function () {
        try {
            const tokensForApprove = 666;
            await instance.approve(accounts[1], tokensForApprove, {from: owner});
            const allowed = await instance.allowance(owner, accounts[1]);
            assert.equal(allowed.c[0], tokensForApprove, 'Allowed and approved tokens are not equal');
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Check that account without approved tokens have zero allowed tokens', async function () {
        try {
            const allowed = await instance.allowance(owner, accounts[1]);
            assert.equal(allowed.c[0], 0, 'Allowed token are not zero');
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Burn some Owner tokens from the total supply', async function () {
        try {
            const tokensToBurnByOwner = web3.toBigNumber('1e19');
            const initialOwnerBalance = await instance.balanceOf(owner);
            await instance.burnFrom(owner, tokensToBurnByOwner);

            assert.equal(
                (await instance.balanceOf(owner)).toString(),
                initialOwnerBalance.sub(tokensToBurnByOwner).toString()
            );

            assert.equal(
                (await instance.totalSupply()).toString(),
                INITIAL_SUPPLY.sub(tokensToBurnByOwner).toString()
            )
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Burn some Owner tokens allowed to spend by whitelisted user', async function () {
        try {
            const tokensToBurnByWhitelistedUser = web3.toBigNumber('1e19');
            const initialOwnerBalance = await instance.balanceOf(owner);

            await instance.allowAddress(whitelistedUser, true);
            await instance.approve(whitelistedUser, tokensToBurnByWhitelistedUser);
            await instance.burnFrom(owner, tokensToBurnByWhitelistedUser, {from: whitelistedUser});

            assert.equal(
                (await instance.balanceOf(owner)).toString(),
                initialOwnerBalance.sub(tokensToBurnByWhitelistedUser).toString()
            );

            assert.equal(
                (await instance.totalSupply()).toString(),
                INITIAL_SUPPLY.sub(tokensToBurnByWhitelistedUser).toString()
            )
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Exception when try to burn the owner tokens which are not allowed ', async function() {
        try {
            const tokensToBurnByWhitelistedUser = web3.toBigNumber('1e19');
            await instance.allowAddress(whitelistedUser, true);
            expectThrow(
                instance.burnFrom(owner, tokensToBurnByWhitelistedUser, {from: whitelistedUser})
            );
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Exception when try to burn the tokens from non-whitelisted user', async function() {
        try {
            const tokensToBurnByWhitelistedUser = web3.toBigNumber('1e19');
            const initialOwnerBalance = await instance.balanceOf(owner);

            await instance.approve(whitelistedUser, tokensToBurnByWhitelistedUser);
            expectThrow(
                instance.burnFrom(owner, tokensToBurnByWhitelistedUser, {from: whitelistedUser})
            );
        } catch (err) {
            assert(false, err.message);
        }
    });
});