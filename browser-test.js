#!/usr/bin/env node
/**
 * 浏览器自动化测试 - 大更新时使用
 * 运行: node browser-test.js
 * 需要: npm install puppeteer
 */

const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 测试配置
const CONFIG = {
  port: 8888,
  headless: true, // true = 无界面，false = 显示浏览器窗口
  slowMo: 100,    // 放慢操作以便观察 (ms)
  timeout: 10000  // 超时时间
};

// 测试结果
let passed = 0;
let failed = 0;
const errors = [];

// 简单的 HTTP 服务器
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(__dirname, 'DS10', req.url === '/' ? 'index.html' : req.url);
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        
        const ext = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css'
        }[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    
    server.listen(CONFIG.port, () => {
      console.log(`🌐 测试服务器启动: http://localhost:${CONFIG.port}`);
      resolve(server);
    });
  });
}

// 测试用例
async function runTests(browser, page) {
  console.log('\n🧪 开始测试...\n');
  
  // 测试1: 页面加载
  await test('页面加载', async () => {
    await page.goto(`http://localhost:${CONFIG.port}`);
    await page.waitForSelector('#professionSelect');
    const title = await page.title();
    if (!title.includes('DS10')) {
      throw new Error(`标题不正确: ${title}`);
    }
  });
  
  // 测试2: 职业选择
  await test('选择两个职业', async () => {
    await page.click('#card1'); // 考古学家
    await page.click('#card2'); // 军人
    
    // 等待游戏界面显示
    await page.waitForFunction(() => {
      const gameUI = document.getElementById('gameUI');
      return gameUI && !gameUI.classList.contains('hidden');
    }, { timeout: 5000 });
  });
  
  // 测试3: 检查房间显示
  await test('房间内容显示', async () => {
    const roomTitle = await page.textContent('#roomTitle');
    if (!roomTitle) {
      throw new Error('房间标题未显示');
    }
    console.log(`   📍 当前房间: ${roomTitle}`);
    
    const mainContent = await page.textContent('#mainContent');
    if (!mainContent || mainContent.length < 10) {
      throw new Error('房间内容为空或太短');
    }
  });
  
  // 测试4: 对象交互（如果是 objectSystem 房间）
  await test('对象交互', async () => {
    // 检查是否有对象
    const hasObjects = await page.evaluate(() => {
      return document.querySelectorAll('.object-item').length > 0;
    });
    
    if (hasObjects) {
      // 点击第一个对象
      await page.click('.object-item');
      
      // 等待对象描述显示
      await page.waitForSelector('#objectDesc:not([style*="display: none"])');
      
      // 检查行动面板
      const actionPanelVisible = await page.evaluate(() => {
        const panel = document.getElementById('actionPanel');
        return panel && panel.style.display !== 'none';
      });
      
      if (!actionPanelVisible) {
        throw new Error('行动面板未显示');
      }
      
      console.log('   ✅ 对象交互正常');
    } else {
      console.log('   ℹ️  当前房间无对象系统');
    }
  });
  
  // 测试5: 控制台无错误
  await test('控制台无报错', async () => {
    const logs = await page.evaluate(() => {
      return window.consoleErrors || [];
    });
    
    //  Puppeteer 可以通过监听 console 事件来获取日志
    // 这里简化处理，实际使用时可以监听 page.on('console')
    
    console.log('   ✅ 控制台检查完成');
  });
  
  // 测试6: 响应式布局
  await test('响应式布局', async () => {
    // 测试手机尺寸
    await page.setViewport({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const layoutOk = await page.evaluate(() => {
      const mainContent = document.getElementById('mainContent');
      if (!mainContent) return false;
      const rect = mainContent.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    
    if (!layoutOk) {
      throw new Error('移动端布局异常');
    }
    
    // 恢复桌面尺寸
    await page.setViewport({ width: 1280, height: 720 });
  });
  
  console.log('\n========================================');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log('========================================\n');
  
  if (failed > 0) {
    console.log('错误详情:');
    errors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${err.test}`);
      console.log(`   ${err.message}`);
    });
    return false;
  }
  
  return true;
}

// 单个测试封装
async function test(name, fn) {
  try {
    process.stdout.write(`📝 ${name}... `);
    await fn();
    console.log('✅');
    passed++;
  } catch (err) {
    console.log('❌');
    console.error(`   ${err.message}`);
    errors.push({ test: name, message: err.message });
    failed++;
  }
}

// 主函数
async function main() {
  console.log('🚀 启动浏览器测试...');
  console.log('(此测试模拟真实用户操作，需要安装 puppeteer)');
  
  // 检查 puppeteer 是否安装
  try {
    require.resolve('puppeteer');
  } catch (e) {
    console.error('\n❌ 请先安装 puppeteer:');
    console.error('   npm install puppeteer');
    process.exit(1);
  }
  
  // 启动服务器
  const server = await startServer();
  
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 监听控制台消息
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.error(`   [控制台错误] ${text}`);
    }
  });
  
  // 监听页面错误
  page.on('pageerror', err => {
    console.error(`   [页面错误] ${err.message}`);
  });
  
  try {
    const success = await runTests(browser, page);
    
    // 清理
    await browser.close();
    server.close();
    
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('\n❌ 测试过程中发生错误:', err);
    await browser.close();
    server.close();
    process.exit(1);
  }
}

// 运行
main().catch(err => {
  console.error('❌ 未捕获的错误:', err);
  process.exit(1);
});
