const express = require('express');
const fs = require('fs');
const path = require('path');
const { generateWallet, queryAddress, performTransfer } = require('./ethereum');

const app = express();
const port = 8000;

app.use(express.json());

// HTML 页面
app.get('/', (req, res) => {
  res.send(getHtmlPage());
});

function getHtmlPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ETH Wallet Pro - 专业以太坊钱包</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); min-height: 100vh; color: #e2e8f0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; }
    
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 2rem; font-weight: 700; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; }
    .header p { color: #94a3b8; font-size: 0.95rem; }
    
    .card { background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(20px); border-radius: 20px; padding: 28px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    
    .tabs { display: flex; background: rgba(0, 0, 0, 0.2); border-radius: 12px; padding: 4px; margin-bottom: 24px; }
    .tabs button { flex: 1; padding: 14px 16px; border: none; background: transparent; color: #94a3b8; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500; transition: all 0.2s; }
    .tabs button.active { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; }
    .tabs button:not(.active):hover { background: rgba(255, 255, 255, 0.05); }
    
    .input-group { margin-bottom: 16px; }
    .input-group label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 6px; font-weight: 500; }
    .input-group input, .input-group select { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.2); color: #f1f5f9; font-size: 1rem; transition: all 0.2s; }
    .input-group input:focus, .input-group select:focus { outline: none; border-color: #06b6d4; box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1); }
    .input-group input::placeholder, .input-group select::placeholder { color: #475569; }
    
    .input-group select option { background: #1e293b; color: #f1f5f9; border: none; }
    
    .btn { width: 100%; padding: 16px; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 40px rgba(6, 182, 212, 0.3); }
    .btn-primary:active { transform: translateY(0); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; }
    .btn-danger:hover { transform: translateY(-1px); box-shadow: 0 10px 40px rgba(239, 68, 68, 0.3); }
    .btn-danger:active { transform: translateY(0); }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    
    .result { margin-top: 20px; padding: 20px; border-radius: 12px; }
    .result.success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); }
    .result.error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
    .result .title { font-size: 1rem; font-weight: 600; margin-bottom: 12px; }
    .result.success .title { color: #22c55e; }
    .result.error .title { color: #ef4444; }
    
    .wallet-info { background: rgba(0, 0, 0, 0.2); border-radius: 12px; padding: 20px; margin-top: 16px; }
    .wallet-info .item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .wallet-info .item:last-child { border-bottom: none; }
    .wallet-info .item .label { color: #94a3b8; font-size: 0.9rem; font-weight: 500; }
    .wallet-info .item .value { color: #f1f5f9; font-size: 0.9rem; font-family: 'JetBrains Mono', 'Fira Code', monospace; word-break: break-all; }
    .wallet-info .item .value.key { color: #06b6d4; }
    .wallet-info .item .value.private { color: #ef4444; }
    
    .balance-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; }
    .balance-card { background: rgba(0, 0, 0, 0.2); border-radius: 12px; padding: 20px; text-align: center; }
    .balance-card .symbol { font-size: 0.85rem; color: #94a3b8; margin-bottom: 8px; }
    .balance-card .amount { font-size: 1.8rem; font-weight: 700; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .balance-card.eth .amount { background: linear-gradient(135deg, #627eea 0%, #764ba2 100%); -webkit-background-clip: text; background-clip: text; }
    .balance-card.usdt .amount { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); -webkit-background-clip: text; background-clip: text; }
    
    .warning-box { background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .warning-box .icon { font-size: 1.2rem; margin-bottom: 8px; }
    .warning-box p { color: #fbbf24; font-size: 0.9rem; line-height: 1.5; }
    
    .hidden { display: none; }
    
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 0.85rem; }
    .footer a { color: #06b6d4; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    
    .copy-btn { margin-top: 12px; padding: 10px 16px; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 8px; color: #94a3b8; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .copy-btn:hover { background: rgba(255, 255, 255, 0.15); color: #f1f5f9; }
    
    .tooltip { position: relative; }
    .tooltip::after { content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #1e293b; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: #f1f5f9; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.2s; margin-bottom: 8px; border: 1px solid rgba(255, 255, 255, 0.1); }
    .tooltip:hover::after { opacity: 1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 ETH Wallet Pro</h1>
      <p>专业以太坊钱包管理工具</p>
    </div>
    
    <div class="card">
      <div class="tabs">
        <button onclick="showTab('generate')" id="tab-generate" class="active">🎲 生成钱包</button>
        <button onclick="showTab('query')" id="tab-query">📊 查询余额</button>
        <button onclick="showTab('transfer')" id="tab-transfer">💸 转账</button>
      </div>
      
      <div id="panel-generate">
        <button class="btn btn-primary" onclick="generateWallet()">生成新钱包</button>
        <div id="generate-result" class="hidden"></div>
      </div>
      
      <div id="panel-query" class="hidden">
        <div class="input-group">
          <label>以太坊地址</label>
          <input type="text" id="query-address" placeholder="0x..." data-tooltip="输入要查询的以太坊地址">
        </div>
        <button class="btn btn-primary" onclick="queryBalance()">查询余额</button>
        <div id="query-result" class="hidden"></div>
      </div>
      
      <div id="panel-transfer" class="hidden">
        <div class="warning-box">
          <div class="icon">⚠️</div>
          <p>转账操作不可逆，请仔细核对收款地址。私钥是您资产的唯一凭证，请妥善保管！</p>
        </div>
        <div class="input-group">
          <label>私钥</label>
          <input type="text" id="transfer-privateKey" placeholder="0x..." data-tooltip="您的钱包私钥">
        </div>
        <div class="input-group">
          <label>收款地址</label>
          <input type="text" id="transfer-to" placeholder="0x..." data-tooltip="目标以太坊地址">
        </div>
        <div class="input-group">
          <label>转账金额</label>
          <input type="text" id="transfer-amount" placeholder="0.00" data-tooltip="输入转账金额">
        </div>
        <div class="input-group">
          <label>代币类型</label>
          <select id="transfer-token">
            <option value="ETH">ETH - 以太坊</option>
            <option value="USDT">USDT - 泰达币</option>
          </select>
        </div>
        <button class="btn btn-danger" onclick="doTransfer()">执行转账</button>
        <div id="transfer-result" class="hidden"></div>
      </div>
    </div>
    
    <div class="footer">
      <p>ETH Wallet Pro v1.0 | Powered by Express & ethers.js</p>
    </div>
  </div>

  <script>
    function showTab(tab) {
      ['generate','query','transfer'].forEach(function(t) {
        document.getElementById('panel-' + t).classList.add('hidden');
        document.getElementById('tab-' + t).classList.remove('active');
      });
      document.getElementById('panel-' + tab).classList.remove('hidden');
      document.getElementById('tab-' + tab).classList.add('active');
    }

    async function generateWallet() {
      var btn = document.querySelector('#panel-generate .btn');
      btn.disabled = true;
      btn.textContent = '⏳ 生成中...';
      
      try {
        var res = await fetch('/api/generate');
        var data = await res.json();
        
        var result = document.getElementById('generate-result');
        result.classList.remove('hidden');
        result.innerHTML = '<div class="wallet-info">' +
          '<div class="item"><span class="label">钱包地址</span><span class="value key">' + data.address + '</span></div>' +
          '<div class="item"><span class="label">公钥</span><span class="value key">' + data.publicKey + '</span></div>' +
          '<div class="item"><span class="label">私钥</span><span class="value private">' + data.privateKey + '</span></div>' +
          '</div>' +
          '<button class="copy-btn" onclick="copyToClipboard(\'' + data.privateKey + '\')">📋 复制私钥</button>' +
          '<p style="margin-top:12px;color:#fbbf24;font-size:0.85rem;">⚠️ 请立即复制并妥善保管私钥！丢失后无法找回！</p>';
      } catch (err) {
        alert('生成失败: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '生成新钱包';
      }
    }

    async function copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        alert('✓ 已复制到剪贴板');
      } catch (err) {
        alert('复制失败，请手动复制');
      }
    }

    async function queryBalance() {
      var address = document.getElementById('query-address').value.trim();
      if (!address) { alert('请输入以太坊地址'); return; }
      
      var btn = document.querySelector('#panel-query .btn');
      btn.disabled = true;
      btn.textContent = '⏳ 查询中...';
      
      try {
        var res = await fetch('/api/balance?address=' + encodeURIComponent(address));
        var data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        var result = document.getElementById('query-result');
        result.classList.remove('hidden');
        
        var html = '<div class="balance-grid">';
        html += '<div class="balance-card eth"><div class="symbol">ETH</div><div class="amount">' + data.eth + '</div></div>';
        if (data.tokens && data.tokens.length > 0) {
          data.tokens.forEach(function(t) {
            html += '<div class="balance-card ' + t.symbol.toLowerCase() + '"><div class="symbol">' + t.symbol + '</div><div class="amount">' + t.balance + '</div></div>';
          });
        }
        html += '</div>';
        result.innerHTML = html;
      } catch (err) {
        var result = document.getElementById('query-result');
        result.classList.remove('hidden');
        result.className = 'result error';
        result.innerHTML = '<div class="title">❌ 查询失败</div><p>' + err.message + '</p>';
      } finally {
        btn.disabled = false;
        btn.textContent = '查询余额';
      }
    }

    async function doTransfer() {
      var privateKey = document.getElementById('transfer-privateKey').value.trim();
      var to = document.getElementById('transfer-to').value.trim();
      var amount = document.getElementById('transfer-amount').value.trim();
      var token = document.getElementById('transfer-token').value;
      
      if (!privateKey || !to || !amount) { alert('请填写所有字段'); return; }
      if (!to.startsWith('0x')) { alert('收款地址格式不正确'); return; }
      if (isNaN(parseFloat(amount))) { alert('请输入有效的金额'); return; }
      
      var btn = document.querySelector('#panel-transfer .btn');
      btn.disabled = true;
      btn.textContent = '⏳ 转账中...';
      
      try {
        var res = await fetch('/api/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privateKey: privateKey, to: to, amount: amount, token: token })
        });
        var data = await res.json();
        
        var result = document.getElementById('transfer-result');
        result.classList.remove('hidden');
        
        if (data.success) {
          result.className = 'result success';
          result.innerHTML = '<div class="title">✅ 转账成功</div>' +
            '<p style="margin-top:8px;">交易哈希: <a href="https://etherscan.io/tx/' + data.txHash + '" target="_blank" style="color:#06b6d4;">' + data.txHash + '</a></p>';
        } else {
          result.className = 'result error';
          result.innerHTML = '<div class="title">❌ 转账失败</div><p>' + data.error + '</p>';
        }
      } catch (err) {
        var result = document.getElementById('transfer-result');
        result.classList.remove('hidden');
        result.className = 'result error';
        result.innerHTML = '<div class="title">❌ 转账失败</div><p>' + err.message + '</p>';
      } finally {
        btn.disabled = false;
        btn.textContent = '执行转账';
      }
    }
  </script>
</body>
</html>`;
}

// API: 生成钱包
app.get('/api/generate', (req, res) => {
  try {
    const wallet = generateWallet();
    
    res.json({
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 查询余额
app.get('/api/balance', async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: '缺少地址参数' });
  }
  
  try {
    const data = await queryAddress(address);
    res.json({
      eth: data.balance.ETH,
      tokens: data.balance.tokens,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 转账
app.post('/api/transfer', async (req, res) => {
  const { privateKey, to, amount, token } = req.body;
  
  try {
    const result = await performTransfer(privateKey, token, to, amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           以太坊钱包管理工具 Web 版已启动！                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  本地访问: http://localhost:' + port + '                               ║');
  console.log('║  局域网访问: http://<你的IP>:' + port + '                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});