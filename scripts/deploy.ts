import { getContractFactory } from '@nomiclabs/hardhat-ethers/types'
import { ethers } from 'hardhat'
import { IGNORE_LIST, CONTRUCTOR_CONFIG } from './config'

const fromWei = (value: any) => {
  try {
    return ethers.utils.formatUnits(value.toString(), 'ether')
  } catch (error) {
    console.log(error.mesasge)
  }
}

const toWei = (value: any) => {
  try {
    return ethers.utils.parseUnits(value.toString(), 'ether')
  } catch (error) {
    console.log(error.mesasge)
  }
}

var signer: any
async function main() {
  const testFolder = './contracts/'
  const fs = require('fs')
  const files = fs.readdirSync(testFolder)
  const contractAddress = {} as any
  var CONTRACT = {} as any

  const [owner, otherAccount] = await ethers.getSigners()
  signer = owner

  const compiledWETH = require('canonical-weth/build/contracts/WETH9.json')
  const WETH = await new ethers.ContractFactory(compiledWETH.abi, compiledWETH.bytecode, signer)

  const weth = await WETH.deploy()
  contractAddress[`weth`] = weth.address
  const compiledUniswapFactory = require('@uniswap/v2-core/build/UniswapV2Factory.json')
  const UniswapFactory = await new ethers.ContractFactory(
    compiledUniswapFactory.interface,
    compiledUniswapFactory.bytecode,
    signer
  )

  // DEPLOY ALL contracs in folder contracs

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

  //const UniswapFactory = await ethers.getContractFactory('UniswapV2Factory')

  const factory = await UniswapFactory.deploy(signer.address)

  contractAddress[`factory`] = factory.address

  const compiledUniswapRouter = require('@uniswap/v2-periphery/build/UniswapV2Router02')
  const uniswapRouter = await new ethers.ContractFactory(
    compiledUniswapRouter.abi,
    compiledUniswapRouter.bytecode,
    signer
  )
  const routerV2 = await uniswapRouter.deploy(factory.address, weth.address)

  const compiledERC20 = require('@uniswap/v2-core/build/ERC20.json')
  const erc20Factory = new ethers.ContractFactory(compiledERC20.abi, compiledERC20.bytecode, signer)

  const tokenA = await erc20Factory.deploy(toWei(1000000))
  const tokenB = await erc20Factory.deploy(toWei(1000000))

  contractAddress[`tokenA`] = tokenA.address
  contractAddress[`tokenB`] = tokenB.address
  contractAddress[`routerV2`] = routerV2.address

  console.log('-----------------  CreatePair -------------- ')
  await factory.createPair(weth.address, tokenA.address)
  await factory.createPair(weth.address, tokenB.address)

  contractAddress[`pair_tokenA_Weth`] = await factory.getPair(tokenA.address, weth.address)
  contractAddress[`pair_tokenB_Weth`] = await factory.getPair(tokenB.address, weth.address)

  const ABI = {
    factory: require('@uniswap/v2-core/build/UniswapV2Pair.json').abi,
    router: require('@uniswap/v2-periphery/build/UniswapV2Router02.json').abi,
    pair: require('@uniswap/v2-core/build/UniswapV2Pair.json').abi,
    tokenA: require('@uniswap/v2-core/build/ERC20.json').abi,
    tokenB: require('@uniswap/v2-core/build/ERC20.json').abi
  }

  fs.writeFileSync('allAddress.json', JSON.stringify(contractAddress, null, 4))

  fs.writeFileSync('allAbi.json', JSON.stringify(ABI, null, 4))

  console.log('-----------------  Approve -------------- ')
  await tokenA.approve(routerV2.address, toWei(999991119999))
  await tokenB.approve(routerV2.address, toWei(999991119999))

  const addLiquidityETH = async (tokenAddress: string) => {
    console.log('-----------------  addLiquidityETH -------------- ')
    const amountTokenDesired = toWei(100000)
    const amountTokenMin = toWei(100000)
    const amountEthMin = toWei(100)
    await routerV2.addLiquidityETH(
      tokenAddress,
      amountTokenDesired,
      amountTokenMin,
      amountEthMin,
      signer.address,
      new Date().getTime() + 100000,
      {
        value: amountEthMin,
        gasLimit: 30000000
      }
    )
  }

  await addLiquidityETH(tokenA.address)
  await addLiquidityETH(tokenB.address)

  const to = signer.address

  const buy = async (tokenAddress: string) => {
    console.log('-----------------  BUY--------------------')
    const depositValue = 5
    const path = [weth.address, tokenAddress]
    const amountsOut = await routerV2.getAmountsOut(toWei(depositValue), path)

    const amountTokenOut = amountsOut[1]

    const amountOutMin = toWei(+fromWei(amountTokenOut) * 0.9)

    await routerV2.swapExactETHForTokensSupportingFeeOnTransferTokens(
      amountOutMin,
      path,
      to,
      new Date().getTime() + 100000,
      {
        value: toWei(depositValue),
        gasLimit: 30000000
      }
    )
  }

  await buy(tokenA.address)
  await buy(tokenB.address)

  const sell = async (tokenAddress: string) => {
    console.log('-----------------  SELL --------------------')

    await routerV2.swapExactTokensForETHSupportingFeeOnTransferTokens(
      toWei(10000),
      toWei(0.0001),
      [tokenAddress, weth.address],
      to,
      new Date().getTime() + 100000,
      {
        gasLimit: 30000000
      }
    )
  }

  await sell(tokenA.address)
  await sell(tokenB.address)

  const removeLiquid = async (tokenAddress: string) => {
    console.log('-----------------  REMOVE LIQUIDITY --------------------')
    const pairAddress = await factory.getPair(tokenAddress, weth.address)
    console.log({ pairAddress })
    const pairJson = require('@uniswap/v2-core/build/UniswapV2Pair.json')
    const pairContract = new ethers.Contract(pairAddress, pairJson.abi, signer)

    const amountTokenMin_ = toWei(1000)
    const amountETHMin_ = toWei(1)
    const lpBalance = await pairContract.balanceOf(signer.address)

    await pairContract.approve(routerV2.address, toWei(999991119999))

    console.log('xxx lp balance', +fromWei(lpBalance))
    await routerV2.removeLiquidityETHSupportingFeeOnTransferTokens(
      tokenAddress,
      lpBalance,
      amountTokenMin_,
      amountETHMin_,
      signer.address,
      new Date().getTime() + 100000,
      {
        gasLimit: 300000
      }
    )
    const [_token0, { _reserve0, _reserve1 }] = await Promise.all([pairContract.token0(), pairContract.getReserves()])
    console.log({ _token0, _reserve0, _reserve1 })
  }

  await removeLiquid(tokenA.address)
  await removeLiquid(tokenB.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
