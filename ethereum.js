const TronWeb = require('tronweb');

// 波场 RPC 节点列表（按速度排序）
const TRON_RPC_NODES = [
  "https://tron-rpc.publicnode.com",
  "https://api.trongrid.io",
  "https://tron.api.tronstack.io",
];

// 创建 TronWeb 实例，分别设置各节点超时
const tronWeb = new TronWeb({
  fullNode: TRON_RPC_NODES[0],
  solidityNode: TRON_RPC_NODES[0],
  eventServer: TRON_RPC_NODES[0],
});

// 设置 HTTP 请求超时（通过修改 axios 默认配置）
if (tronWeb.fullNode && tronWeb.fullNode.instance) {
  tronWeb.fullNode.instance.defaults.timeout = 120000;
}
if (tronWeb.solidityNode && tronWeb.solidityNode.instance) {
  tronWeb.solidityNode.instance.defaults.timeout = 120000;
}
if (tronWeb.eventServer && tronWeb.eventServer.instance) {
  tronWeb.eventServer.instance.defaults.timeout = 120000;
}

const TRC20_TOKENS = {
  USDT: { symbol: "USDT", contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6 },
  USDC: { symbol: "USDC", contract: "TR8wnMWD2zRgMQvnV39CWz17bmK1GR9j2", decimals: 6 },
  DAI: { symbol: "DAI", contract: "TDa9u9Q7E38v6mJz9sTCG5s6nLzL2T9J6D", decimals: 18 },
};

const TOKENS = { ...TRC20_TOKENS };

const crypto = require('crypto');

async function generateWallet() {
  // 生成随机私钥 (32字节，不带0x前缀)
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKey = privateKeyBytes.toString('hex');
  
  // 从私钥派生地址
  const address = tronWeb.address.fromPrivateKey(privateKey);
  
  return {
    address: address,
    privateKey: privateKey,
    publicKey: address,
  };
}

async function getTokenBalance(address, contractAddress) {
  const contract = await tronWeb.contract().at(contractAddress);
  const balance = await contract.balanceOf(address).call();
  const decimals = await contract.decimals().call();
  const symbol = await contract.symbol().call();
  
  const balanceStr = balance.toString();
  const decimalsNum = parseInt(decimals.toString());
  const len = balanceStr.length;
  let formattedBalance;
  
  if (len <= decimalsNum) {
    formattedBalance = "0." + balanceStr.padStart(decimalsNum, "0");
  } else {
    formattedBalance = balanceStr.slice(0, len - decimalsNum) + "." + balanceStr.slice(len - decimalsNum);
  }
  
  formattedBalance = formattedBalance.replace(/\.?0*$/, "");
  
  const decimalIndex = formattedBalance.indexOf(".");
  if (decimalIndex !== -1 && formattedBalance.length - decimalIndex - 1 > 6) {
    formattedBalance = formattedBalance.slice(0, decimalIndex + 7);
  }
  
  return {
    balance: formattedBalance,
    symbol,
    decimals: decimalsNum,
  };
}

async function transferToken(privateKey, tokenSymbol, toAddress, amount) {
  const tokenInfo = TOKENS[tokenSymbol];

  if (!tokenInfo) {
    throw new Error(`Unsupported token: ${tokenSymbol}`);
  }

  tronWeb.setPrivateKey(privateKey);

  // 获取合约实例
  let contract;
  try {
    contract = await tronWeb.contract().at(tokenInfo.contract);
  } catch (error) {
    throw new Error(`无法连接到 ${tokenSymbol} 合约: ${error.message}`);
  }

  // 计算转账金额（带精度）
  const amountWithDecimals = (parseFloat(amount) * Math.pow(10, tokenInfo.decimals)).toFixed(0);

  // 发送转账交易
  try {
    const tx = await contract.transfer(toAddress, amountWithDecimals).send({
      feeLimit: 100000000  // 设置最大能量费用限制 (100 TRX)
    });
    return tx.transaction || tx;
  } catch (error) {
    if (error.message && error.message.includes('timeout')) {
      throw new Error(`网络超时，请检查网络连接后重试。错误: ${error.message}`);
    }
    throw error;
  }
}

async function queryAddress(address) {
  if (!tronWeb.isAddress(address)) {
    throw new Error("Invalid wallet address");
  }

  const tokenBalances = [];
  for (const [name, info] of Object.entries(TOKENS)) {
    try {
      const balance = await getTokenBalance(address, info.contract);
      tokenBalances.push({ name, ...balance });
    } catch (error) {
      console.error(`查询 ${name} 余额失败:`, error.message);
    }
  }

  return {
    balance: {
      tokens: tokenBalances,
    },
    history: [],
  };
}

// 测试网络连接
async function testConnection() {
  try {
    const block = await tronWeb.trx.getCurrentBlock();
    return { success: true, blockHeight: block.block_header.raw_data.number };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function performTransfer(privateKey, tokenSymbol, toAddress, amount) {
  try {
    if (!tronWeb.isAddress(toAddress)) {
      throw new Error("Invalid recipient address");
    }

    const txHash = await transferToken(privateKey, tokenSymbol, toAddress, amount);

    return { success: true, txHash };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateWallet,
  queryAddress,
  performTransfer,
  testConnection,
  TOKENS,
  TRC20_TOKENS,
};