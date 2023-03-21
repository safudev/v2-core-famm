import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
const { BSC_TESTNET_URL, BSC_TESTNET_DEPLOY_KEY, ARBITRUM_DEPLOY_KEY, ARBITRUM_URL } = require('./env.json')
const config: HardhatUserConfig = {
  solidity: '0.5.16',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    testnet: {
      url: BSC_TESTNET_URL,
      chainId: 97,
      //gasPrice: 300000,
      accounts: [BSC_TESTNET_DEPLOY_KEY],
      allowUnlimitedContractSize: true
    }

    //   arbitrum: {
    //   url: ARBITRUM_URL,
    //   gasPrice: 30000000000,
    //   chainId: 42161,
    //   accounts: [ARBITRUM_DEPLOY_KEY]
    //  },
  }
}

export default config
