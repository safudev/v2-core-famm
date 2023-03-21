import { ethers } from 'hardhat'

import { IGNORE_LIST, CONTRUCTOR_CONFIG } from './config'

var signer
async function main() {
  const testFolder = './contracts/'
  const fs = require('fs')
  const files = fs.readdirSync(testFolder)
  const contractAddress = {} as any
  var CONTRACT = {} as any

  const [owner, otherAccount] = await ethers.getSigners()
  signer = owner

  // weth test
  const compiledWETH = require('canonical-weth/build/contracts/WETH9.json')
  const WETH = await new ethers.ContractFactory(compiledWETH.abi, compiledWETH.bytecode, signer)

  const weth = await WETH.deploy()

  contractAddress[`weth`] = weth.address

  const deployContract = async (contrName: string) => {
    try {
      if (IGNORE_LIST.includes(contrName)) {
        return
      }
      const contract = await ethers.getContractFactory(contrName)

      console.log({ contrName })
      let params = CONTRUCTOR_CONFIG[contrName] ? CONTRUCTOR_CONFIG[contrName] : []
      console.log({ params })

      const contractDeploy = await contract.deploy(...params)
      CONTRACT[contrName] = contractDeploy
      contractAddress[contrName] = contractDeploy.address

      console.log('xxx deploy success')
    } catch (error) {
      console.log('xxx deploy fail')
      console.log('xxx error', error)
    }
  }

  for (const file of files) {
    const name = file.split('.')[0]
    await deployContract(name)
  }

  const getABIS = (patch = './contracts/') => {
    const files = fs.readdirSync(patch)
    const jsonDir = '../artifacts/contracts'
    var ABI = {} as any

    for (const file of files) {
      const name = file.split('.')[0]
      if (IGNORE_LIST.includes(name)) {
        continue
      }
      const jsonFile = require(`${jsonDir}/${file}/${name}.json`)
      ABI[name] = jsonFile.abi
    }

    fs.writeFileSync('ABI.json', JSON.stringify(ABI, null, 4))
  }

  await getABIS()
  await fs.writeFileSync('contractAdress.json', JSON.stringify(contractAddress, null, 4))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
