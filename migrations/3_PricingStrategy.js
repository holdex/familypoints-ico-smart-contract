const PricingStrategy = artifacts.require('PricingStrategy.sol');
const CrowdSale = artifacts.require('CrowdSale.sol');
const web3 = PricingStrategy.web3;

module.exports = async function (deployer) {
    //todo change this price. Currently - 100 tokens for 1 ether
    const ether = web3.toBigNumber(web3.toWei(1, 'ether'));
    const defaultTokenPrice = ether.div(100);

    deployer.deploy(PricingStrategy, defaultTokenPrice);
    deployer.link(PricingStrategy, CrowdSale);
};
