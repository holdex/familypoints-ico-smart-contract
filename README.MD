# Familypoints.io Smart Contracts
[![](logo-red.png)](https://familypoints.io)

[Visit out website at familypoints.io](https://familypoints.io)

### The project based on OpenZeppelin smart contract added into repository (OpenZeppelin 1.3.0)

#### Install project dependencies
1. Install nodejs and npm
2. Install project dependencies: `npm install`

#### Run ganache-cli (do it in a separate bash session). You will need this one before you start testing.
`npm run ganache-cli`   
(in the first case you will get predefined set of accounts suitable for the all test case)

#### Compile smart contracts
`npm run compile`  

#### Run full test suite
##### !NOTE: find `const wallet = "YOUR WALLET ADDRESS GOES HERE";` in the `./migrations/6_CrowdSale.js` file, and set an address from the list that ganache generated for us. Otherwise tests will not run.
`npm run test`  

#### Generate test coverage report
`npm run coverage`     

#### Software versions
Solidity v0.4.19  
Truffle v4.0.6
Ganache CLI v6.1.0-beta.0
OpenZeppelin 1.3.0  
solidity-coverage 0.2.5  
Solium linter 1.0.0 BETA  
solcheck linter 0.1.3  

#### Test coverage report
`coverage/index.html`