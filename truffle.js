module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 8444,
            network_id: "*"
        },
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8555,
            gas: 0xfffffffffff,
            gasPrice: 0x01
        },
        live: {
            network_id: 1,
            host: "localhost",
            port: 8545,
            from: "",
            gasPrice: ""
        }
    }
};
