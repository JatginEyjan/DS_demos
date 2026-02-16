# DS10 Demo 部署说明

## 🌐 GitHub Pages 访问地址

部署后可通过以下地址访问：
```
https://jatgineyjan.github.io/DS_demos/DS10/
```

## 📱 手机测试步骤

### 方法1：等待自动部署（推荐）
1. 你需要在本地将代码推送到GitHub
2. GitHub Pages会自动部署（通常1-2分钟）
3. 手机浏览器访问上面的链接

### 方法2：本地临时服务器（立即测试）
在电脑终端运行：
```bash
cd DS10
python -m http.server 8000
```

然后手机浏览器访问：
```
http://[你的电脑IP]:8000
```

例如：`http://192.168.1.100:8000`

### 方法3：直接文件打开
将 `DS10/index.html` 和 `DS10/game.js` 复制到手机
用手机浏览器打开 index.html

## 🎮 游戏操作说明

### 界面布局
- **顶部**：HP/SAN状态栏 + 时间
- **中部**：像素画面（点击对象）
- **下部**：行动按钮 + 日志

### 操作流程
1. 选择职业（考古学家/军人/神秘学者）
2. 在地图上选择房间探索
3. 进入房间后点击对象（宝箱/怪物等）
4. 选择行动进行技能检定
5. 清理房间后返回安全屋恢复
6. 完成所有房间或撤离

### 触屏操作
- 点击：选择对象/执行行动
- 按钮：所有操作都有对应按钮
- 支持竖屏/横屏

## 📝 已知问题

- iOS Safari可能需要允许自动播放（虽然无声）
- 部分安卓浏览器可能不支持某些CSS动画
- 建议使用Chrome/Safari/Firefox

## 🔧 推送GitHub命令

在本地仓库执行：
```bash
git add DS10/
git commit -m "Deploy DS10 Demo"
git push origin master
```

然后访问：
https://jatgineyjan.github.io/DS_demos/DS10/