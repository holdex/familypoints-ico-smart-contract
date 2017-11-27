const AffiliateSystem = artifacts.require('AffiliateSystem.sol');
const web3 = AffiliateSystem.web3;

const expectThrow = require('./helpers/expectThrow');
const getParamFromTransactionEvent = require('./helpers/getParamFromTxEvent');


async function deployAffiliateSystem() {
    return AffiliateSystem.new();
}

contract('AffiliateSystem', function (accounts) {
    let instance;

    const leader = accounts[1];
    const follower = accounts[2];
    const whitelisted = accounts[3];

    beforeEach(async () => {
        instance = await deployAffiliateSystem();
        assert.ok(instance);
    });

    it('Check leader system interface', async function () {
        try {
            assert.isTrue(
                await instance.isAffiliateSystem()
            )
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Address is not leader', async function () {
        try {
            assert.isFalse(
                await instance.isLeader(leader)
            )
        } catch (err) {
            assert(false, err.message)

        }
    });

    it('Address is leader with peers', async function () {
        try {
            await instance.registerLeader(leader);

            assert.isTrue(
                await instance.isLeader(leader)
            );

            await instance.registerFollower(leader, follower);

            assert.include(
                await instance.getFollowers(leader),
                follower
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Exception when trying to get peers of non-existent leader', async function () {
        try {
            expectThrow(
                instance.getFollowers(leader)
            )
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Peer was added only once', async function () {
        try {
            await instance.registerLeader(leader);

            await instance.registerFollower(leader, follower);

            const peersCount = (await instance.getFollowers(leader)).length;

            await instance.registerFollower(leader, follower);

            assert.equal(
                (await instance.getFollowers(leader)).length,
                peersCount
            )

        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Peer was not added to non-existent leader', async function () {
        try {
            await instance.registerFollower(leader, follower);
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Add leader and follower from whitelisted address', async function () {
        try {
            await instance.allowAddress(whitelisted, true);

            await instance.registerLeader(leader, {from: whitelisted});
            await instance.registerFollower(leader, follower, {from: whitelisted});

            assert.isTrue(
                await instance.isLeader(leader)
            );

            assert.include(
                await instance.getFollowers(leader),
                follower
            );
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Exceptions when trying to add leader and follower from non-whitelisted address', async function () {
        try {
            expectThrow(
                instance.registerLeader(leader, {from: whitelisted})
            );

            expectThrow(
                instance.registerFollower(leader, follower, {from: whitelisted})
            )
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Don not register 0x00 address', async function () {
       try {
           await instance.registerLeader(0x00);
           assert.isFalse(await instance.isLeader(0x00));

           await instance.registerLeader(leader);
           await instance.registerFollower(leader, 0x00);
           assert.notInclude(
               await instance.getFollowers(leader),
               follower
           );
       } catch (err) {
           assert(false, err.message);
       }
    });
});
