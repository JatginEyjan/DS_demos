# DS10 测试流程规范

**版本**: v1.0  
**创建时间**: 2026-02-20  
**适用范围**: DS10 及后续版本部署前必检

---

## 一、代码层面测试 (本地)

### 1.1 语法检查 ✅
```bash
# 检查 JavaScript 语法错误
cd /home/admin/.openclaw/workspace-codeMaster/DS_Demo/DS10
node --check index.html 2>&1 | grep -i error || echo "Syntax OK"

# 检查重复函数定义
grep -n "^function " index.html | sort | uniq -d
```

**必检项**:
- [ ] 无语法错误
- [ ] 无重复函数定义
- [ ] 无未闭合括号
- [ ] 无未定义变量引用

### 1.2 关键函数检查 ✅
```bash
# 检查核心函数是否存在且唯一
grep -c "^function startGame" index.html    # 应为1
grep -c "^function enterRoom" index.html     # 应为1
grep -c "^function executeAction" index.html # 应为1
grep -c "^function updateProfile" index.html # 应为1
```

**必检项**:
- [ ] 所有核心函数只定义一次
- [ ] 无函数名拼写错误

---

## 二、功能流程测试 (本地预览)

### 2.1 基础流程测试 ✅

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|----------|------|
| 1 | 打开 index.html | 显示职业选择界面 | ☐ |
| 2 | 选择第1个职业 | 卡片高亮 | ☐ |
| 3 | 选择第2个职业 | 两个卡片高亮，自动进入游戏 | ☐ |
| 4 | 进入游戏 | 显示房间1内容 | ☐ |
| 5 | 点击对象 | 显示对象描述和行动按钮 | ☐ |
| 6 | 执行行动 | 显示判定结果和反馈 | ☐ |
| 7 | 解决所有对象 | 出口解锁 | ☐ |
| 8 | 点击出口 | 进入下一房间 | ☐ |

### 2.2 v0.3+ 新功能测试 ✅

| 功能 | 测试步骤 | 预期结果 | 状态 |
|------|----------|----------|------|
| 画像系统 | 强行推开碎石堆 | profile.pragmatic 增加 | ☐ |
| 残留系统 | 解决对象后检查 | roomResidues 有记录 | ☐ |
| 回响系统 | 从入口→塌陷通道 | 显示回响文本 | ☐ |
| 对话树 | 与马库斯对话 | 显示多轮对话选项 | ☐ |

---

## 三、浏览器兼容性测试

### 3.1 桌面端 ✅
- [ ] Chrome (最新版)
- [ ] Firefox (最新版)
- [ ] Safari (最新版)
- [ ] Edge (最新版)

### 3.2 移动端 ✅
- [ ] Chrome Android
- [ ] Safari iOS
- [ ] 微信内置浏览器

### 3.3 检查项
- [ ] 布局无错乱
- [ ] 按钮可点击
- [ ] 文字清晰可读
- [ ] 无控制台报错

---

## 四、部署前检查清单

### 4.1 Git 提交前 ✅
```bash
cd /home/admin/.openclaw/workspace-codeMaster/DS_Demo
```

- [ ] `git status` 确认修改文件正确
- [ ] `git diff` 检查修改内容
- [ ] 提交信息描述清晰
- [ ] 推送成功无冲突

### 4.2 GitHub Pages 部署后 ✅
```bash
# 等待 30-60 秒让 GitHub Pages 更新
sleep 30
```

- [ ] 页面可访问 (HTTP 200)
- [ ] 标题显示正确
- [ ] 职业选择界面正常
- [ ] 无控制台报错

---

## 五、自动化测试脚本

### 5.1 快速测试脚本
```bash
#!/bin/bash
# save as: test-ds10.sh

echo "=== DS10 快速测试 ==="

# 1. 语法检查
echo "1. 检查语法..."
if node --check DS10/index.html 2>&1 | grep -i error; then
    echo "❌ 语法错误！"
    exit 1
else
    echo "✅ 语法正常"
fi

# 2. 检查重复函数
echo "2. 检查重复函数..."
DUPLICATES=$(grep "^function " DS10/index.html | sort | uniq -d)
if [ -n "$DUPLICATES" ]; then
    echo "❌ 发现重复函数:"
    echo "$DUPLICATES"
    exit 1
else
    echo "✅ 无重复函数"
fi

# 3. 检查核心函数
echo "3. 检查核心函数..."
for func in "startGame" "enterRoom" "executeAction" "updateProfile"; do
    COUNT=$(grep -c "^function $func" DS10/index.html)
    if [ "$COUNT" -ne 1 ]; then
        echo "❌ $func 定义次数: $COUNT (应为1)"
        exit 1
    fi
done
echo "✅ 核心函数正常"

# 4. 检查文件大小
echo "4. 检查文件大小..."
SIZE=$(stat -f%z DS10/index.html 2>/dev/null || stat -c%s DS10/index.html)
if [ "$SIZE" -gt 500000 ]; then
    echo "⚠️ 文件过大: $SIZE bytes"
else
    echo "✅ 文件大小正常: $SIZE bytes"
fi

echo "=== 测试通过 ==="
```

### 5.2 使用方式
```bash
chmod +x test-ds10.sh
./test-ds10.sh
```

---

## 六、Bug 修复流程

### 6.1 发现问题
1. 收集错误信息（截图、控制台日志）
2. 确定复现步骤
3. 分析根本原因

### 6.2 修复问题
1. 本地修改代码
2. 运行测试脚本验证
3. 手动测试验证

### 6.3 部署修复
1. Git 提交（清晰描述修复内容）
2. 推送到 GitHub
3. 等待 30-60 秒
4. 在线验证修复
5. 通知测试人员验证

---

## 七、测试记录模板

```markdown
## 测试记录 - YYYY-MM-DD

**测试人员**: 
**测试版本**: 
**测试环境**: 

### 测试结果
- [ ] 基础流程通过
- [ ] v0.3+ 功能通过
- [ ] 移动端正常
- [ ] 无控制台报错

### 发现问题
1. 问题描述:
   - 现象:
   - 复现步骤:
   - 修复状态:

### 部署确认
- [ ] Git 提交成功
- [ ] GitHub Pages 更新
- [ ] 在线测试通过

**结论**: ✅ 可发布 / ❌ 需修复
```

---

## 八、责任分工

| 角色 | 职责 |
|------|------|
| 开发者 | 代码编写、本地测试、修复Bug |
| 测试员 (Rhy) | 功能测试、体验反馈、Bug报告 |
| 协调者 (Eyjan) | 进度把控、决策确认、发布审批 |

---

## 九、快速检查表（打印版）

```
□ 1. 语法检查通过
□ 2. 无重复函数
□ 3. 本地预览正常
□ 4. Git 提交成功
□ 5. GitHub Pages 更新
□ 6. 在线测试通过
□ 7. 通知测试人员
```

---

**严格执行此流程，确保每次部署质量！**
