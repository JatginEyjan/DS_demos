#!/usr/bin/env node
/**
 * 快速代码检查 - 每次保存/提交前运行
 * 运行: node check-code.js
 */

const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, 'DS10', 'index.html');

console.log('🔍 运行快速代码检查...\n');

let errors = 0;
let warnings = 0;

// 读取文件
if (!fs.existsSync(TARGET_FILE)) {
  console.error(`❌ 文件不存在: ${TARGET_FILE}`);
  process.exit(1);
}

const content = fs.readFileSync(TARGET_FILE, 'utf8');

// 提取 script 部分
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('❌ 找不到 <script> 标签');
  process.exit(1);
}

const jsCode = scriptMatch[1];

// 检查1: 大括号平衡
console.log('1️⃣  检查大括号平衡...');
const openBraces = (jsCode.match(/{/g) || []).length;
const closeBraces = (jsCode.match(/}/g) || []).length;
if (openBraces !== closeBraces) {
  console.error(`   ❌ 大括号不匹配: { ${openBraces} } vs } ${closeBraces}`);
  console.error(`   差值: ${openBraces - closeBraces}`);
  errors++;
} else {
  console.log(`   ✅ 大括号平衡 (${openBraces})`);
}

// 检查2: 括号平衡
console.log('\n2️⃣  检查括号平衡...');
const openParens = (jsCode.match(/\(/g) || []).length;
const closeParens = (jsCode.match(/\)/g) || []).length;
if (openParens !== closeParens) {
  console.error(`   ❌ 括号不匹配: ( ${openParens} ) vs ) ${closeParens}`);
  errors++;
} else {
  console.log(`   ✅ 括号平衡 (${openParens})`);
}

// 检查3: 方括号平衡
console.log('\n3️⃣  检查方括号平衡...');
const openBrackets = (jsCode.match(/\[/g) || []).length;
const closeBrackets = (jsCode.match(/\]/g) || []).length;
if (openBrackets !== closeBrackets) {
  console.error(`   ❌ 方括号不匹配: [ ${openBrackets} ] vs ] ${closeBrackets}`);
  errors++;
} else {
  console.log(`   ✅ 方括号平衡 (${openBrackets})`);
}

// 检查4: 重复函数定义
console.log('\n4️⃣  检查重复函数...');
const funcRegex = /^function\s+(\w+)\s*\(/gm;
const functions = [];
let match;
while ((match = funcRegex.exec(jsCode)) !== null) {
  functions.push(match[1]);
}

const duplicates = functions.filter((item, index) => functions.indexOf(item) !== index);
if (duplicates.length > 0) {
  console.error(`   ❌ 发现重复函数:`);
  [...new Set(duplicates)].forEach(fn => console.error(`      - ${fn}`));
  errors++;
} else {
  console.log(`   ✅ 无重复函数 (${functions.length} 个函数)`);
}

// 检查5: 核心函数是否存在
console.log('\n5️⃣  检查核心函数...');
const requiredFuncs = ['startGame', 'enterRoom', 'executeAction', 'selectObject', 'updateStatus'];
const missingFuncs = requiredFuncs.filter(fn => !functions.includes(fn));
if (missingFuncs.length > 0) {
  console.error(`   ❌ 缺少核心函数:`);
  missingFuncs.forEach(fn => console.error(`      - ${fn}`));
  errors++;
} else {
  console.log(`   ✅ 所有核心函数存在`);
}

// 检查6: 未闭合的字符串
console.log('\n6️⃣  检查字符串...');
const singleQuotes = (jsCode.match(/'/g) || []).length;
const doubleQuotes = (jsCode.match(/"/g) || []).length;
if (singleQuotes % 2 !== 0) {
  console.warn(`   ⚠️  单引号可能未闭合: ${singleQuotes}`);
  warnings++;
}
if (doubleQuotes % 2 !== 0) {
  console.warn(`   ⚠️  双引号可能未闭合: ${doubleQuotes}`);
  warnings++;
}
if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
  console.log(`   ✅ 字符串引号正常`);
}

// 检查7: 常见错误模式
console.log('\n7️⃣  检查常见错误...');
const issues = [];

// 检查 console.log 是否保留（生产环境应该移除或注释）
const consoleLogs = (jsCode.match(/console\.log/g) || []).length;
if (consoleLogs > 20) {
  warnings++;
}

// 检查是否有未定义的变量使用（简单检查）
if (jsCode.includes('undefined')) {
  const undefinedMatches = jsCode.match(/undefined/g);
  if (undefinedMatches && undefinedMatches.length > 5) {
    warnings++;
  }
}

console.log(`   ✅ 检查完成 (${consoleLogs} 个 console.log)`);

// 输出结果
console.log('\n========================================');
if (errors === 0) {
  console.log('✅ 检查通过！');
  if (warnings > 0) {
    console.log(`⚠️  有 ${warnings} 个警告`);
  }
  console.log('可以安全部署');
  process.exit(0);
} else {
  console.log(`❌ 发现 ${errors} 个错误`);
  if (warnings > 0) {
    console.log(`⚠️  另有 ${warnings} 个警告`);
  }
  console.log('请修复错误后再部署');
  process.exit(1);
}
