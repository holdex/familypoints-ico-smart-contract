const BonusStrategy = artifacts.require('BonusStrategy.sol');
const web3 = BonusStrategy.web3;

const expectThrow = require('./helpers/expectThrow');

async function deployStrategy() {
    return BonusStrategy.new();
}

contract('BonusStrategy', function (accounts) {
    let instance;

    const owner = accounts[0];
    const nonOwner = accounts[1];

    const ether = web3.toBigNumber(web3.toWei(1, 'ether'));

    const specificBonusesList = [];

    specificBonusesList[0] = {
        'fromAmountWei': ether,
        'toAmountWei': ether.mul(2),
        'bonusPercent': 15
    };

    specificBonusesList[1] = {
        'fromAmountWei': ether.mul(2),
        'toAmountWei': ether.mul(3),
        'bonusPercent': 25
    };

    beforeEach(async () => {
        instance = await deployStrategy();
        assert.ok(instance);
    });

    it('Check public properties', async function () {
        try {
            await instance.stageBonus();
            await instance.followerBonus();
            await instance.leaderBonus();
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Check bonuses calculation', async function () {
        try {
            //100 tokens
            const defaultTokens = web3.toBigNumber('1e20');

            //Stage bonuses
            const stageBonusPercent = 30;
            const leaderBonusPercent = 4;
            const followerBonusPercent = 5;

            //Tokens will get according to stage bonuses
            const stageBonusTokens = web3.toBigNumber('3e19');
            const leaderBonusTokens = web3.toBigNumber('4e18');
            const followerBonusTokens = web3.toBigNumber('5e18');

            await instance.setStageBonus(stageBonusPercent);
            await instance.setLeaderBonus(leaderBonusPercent);
            await instance.setFollowerBonus(followerBonusPercent);

            assert.equal(
                (await instance.calculateStageBonus(defaultTokens)).toString(),
                stageBonusTokens.toString()
            );

            assert.equal(
                (await instance.calculateLeaderBonus(defaultTokens)).toString(),
                leaderBonusTokens
            );

            assert.equal(
                (await instance.calculateFollowerBonus(defaultTokens)).toString(),
                followerBonusTokens
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Check zero bonuses calculation', async function () {
        try {
            //100 tokens
            const defaultTokens = web3.toBigNumber('1e20');

            //Stage bonuses
            const stageBonusPercent = 0;
            const leaderBonusPercent = 0;
            const followerBonusPercent = 0;

            const stageBonusTokens = web3.toBigNumber('0');
            const leaderBonusTokens = web3.toBigNumber('0');
            const followerBonusTokens = web3.toBigNumber('0');

            await instance.setStageBonus(stageBonusPercent);
            await instance.setLeaderBonus(leaderBonusPercent);
            await instance.setFollowerBonus(followerBonusPercent);

            assert.equal(
                (await instance.calculateStageBonus(defaultTokens)).toString(),
                stageBonusTokens.toString()
            );

            assert.equal(
                (await instance.calculateLeaderBonus(defaultTokens)).toString(),
                leaderBonusTokens
            );

            assert.equal(
                (await instance.calculateFollowerBonus(defaultTokens)).toString(),
                followerBonusTokens
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Check specific bonus getter and setter', async function () {
        try {
            await instance.setSpecificBonusSegment(
                0,
                specificBonusesList[0].fromAmountWei,
                specificBonusesList[0].toAmountWei,
                specificBonusesList[0].bonusPercent
            );

            let currentSpecificBonusSegment = await instance.getSpecificBonusSegment(0);

            assert.equal(
                currentSpecificBonusSegment[0].toString(),
                specificBonusesList[0].fromAmountWei.toString()
            );
            assert.equal(
                currentSpecificBonusSegment[1].toString(),
                specificBonusesList[0].toAmountWei.toString()
            );
            assert.equal(
                currentSpecificBonusSegment[2].toString(),
                specificBonusesList[0].bonusPercent.toString()
            );

            await instance.setSpecificBonusSegment(
                1,
                specificBonusesList[1].fromAmountWei,
                specificBonusesList[1].toAmountWei,
                specificBonusesList[1].bonusPercent
            );

            currentSpecificBonusSegment = await instance.getSpecificBonusSegment(1);

            assert.equal(
                currentSpecificBonusSegment[0].toString(),
                specificBonusesList[1].fromAmountWei.toString()
            );
            assert.equal(
                currentSpecificBonusSegment[1].toString(),
                specificBonusesList[1].toAmountWei.toString()
            );
            assert.equal(
                currentSpecificBonusSegment[2].toString(),
                specificBonusesList[1].bonusPercent.toString()
            );
        } catch(err) {
            assert(false, err.message)
        }
    });

    it('Check calculate of specific bonus. Check calculation of specific bonus after reset.', async function () {
        try {
            const baseTokensAmount = web3.toBigNumber('1e18');
            const firstSegmentBonus = baseTokensAmount.mul(specificBonusesList[0].bonusPercent).div(100);
            const secondSegmentBonus = baseTokensAmount.mul(specificBonusesList[1].bonusPercent).div(100);

            await instance.setSpecificBonusSegment(
                0,
                specificBonusesList[0].fromAmountWei,
                specificBonusesList[0].toAmountWei,
                specificBonusesList[0].bonusPercent
            );

            await instance.setSpecificBonusSegment(
                1,
                specificBonusesList[1].fromAmountWei,
                specificBonusesList[1].toAmountWei,
                specificBonusesList[1].bonusPercent
            );

            assert.equal(
                (await instance.calculateSpecificBonus(baseTokensAmount, ether)).toString(),
                firstSegmentBonus.toString()
            );

            assert.equal(
                (await instance.calculateSpecificBonus(baseTokensAmount, ether.mul(2))).toString(),
                secondSegmentBonus.toString()
            );

            //Reset all bonuses
            await instance.resetSpecificBonuses();

            assert.equal(
                (await instance.calculateSpecificBonus(baseTokensAmount, ether.mul(2))).toString(),
                0
            );

            assert.equal(
                (await instance.calculateSpecificBonus(baseTokensAmount, ether)).toString(),
                0
            );
        } catch(err) {
            assert(false, err.message);
        }
    });

    it('Check calculate of common bonus with fallback to stage bonus. Check calculation of common bonus after reset', async function () {
        try {
            const stageBonusPercent = 30;
            const baseTokensAmount = web3.toBigNumber('1e18');

            const fallbackBonusTokens = baseTokensAmount.mul(stageBonusPercent).div(100);
            const firstSegmentBonus = baseTokensAmount.mul(specificBonusesList[0].bonusPercent).div(100);
            const secondSegmentBonus = baseTokensAmount.mul(specificBonusesList[1].bonusPercent).div(100);

            await instance.setStageBonus(stageBonusPercent);

            await instance.setSpecificBonusSegment(
                0,
                specificBonusesList[0].fromAmountWei,
                specificBonusesList[0].toAmountWei,
                specificBonusesList[0].bonusPercent
            );

            await instance.setSpecificBonusSegment(
                1,
                specificBonusesList[1].fromAmountWei,
                specificBonusesList[1].toAmountWei,
                specificBonusesList[1].bonusPercent
            );

            assert.equal(
                (await instance.calculateCommonBonus(baseTokensAmount, ether)).toString(),
                firstSegmentBonus.toString()
            );

            assert.equal(
                (await instance.calculateCommonBonus(baseTokensAmount, ether.mul(2))).toString(),
                secondSegmentBonus.toString()
            );

            assert.equal(
                (await instance.calculateCommonBonus(baseTokensAmount, ether.div(2))).toString(),
                fallbackBonusTokens.toString()
            );

            assert.equal(
                (await instance.calculateCommonBonus(baseTokensAmount, ether.mul(3))).toString(),
                fallbackBonusTokens.toString()
            );

            //Reset bonuses
            await instance.resetSpecificBonuses();

            assert.equal(
                (await instance.calculateCommonBonus(baseTokensAmount, ether)).toString(),
                fallbackBonusTokens.toString()
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Exceptions when trying to set bonus from non-owner and trying to reset bonus from non-owner', async function () {
        try {
            expectThrow(
                instance.setSpecificBonusSegment(
                    0,
                    specificBonusesList[0].fromAmountWei,
                    specificBonusesList[0].toAmountWei,
                    specificBonusesList[0].bonusPercent,
                    {
                        from: nonOwner
                    }
                )
            );

            expectThrow(
                instance.resetSpecificBonuses({from: nonOwner})
            )
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Exceptions when put an incorrect parameters in setSpecificBonus() method', async function () {
        try {
            expectThrow(
                instance.setSpecificBonusSegment(10, ether, ether.mul(2), 15)
            );

            expectThrow(
                instance.setSpecificBonusSegment(0, ether, ether, 15)
            );

            expectThrow(
                instance.setSpecificBonusSegment(0, ether.mul(2), ether, 15)
            );
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Exceptions when trying to set bonuses by non-owner', async function () {
        try {
            expectThrow(
                instance.setStageBonus(42, {from: accounts[1]})
            );

            expectThrow(
                instance.setLeaderBonus(24, {from: accounts[1]})
            );

            expectThrow(
                instance.setFollowerBonus(0, {from: accounts[1]})
            )
        } catch (err) {
            assert(false, err.message)
        }
    });

    it('Check bonus strategy interface', async function () {
        try {
            assert.isTrue(await instance.isBonusStrategy());
        } catch (err) {
            assert(false, err.message)
        }
    })
});
