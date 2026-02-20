/**
 * 简化版错误面板 - 仅显示报错信息
 * 使用: 在 </body> 前引入 <script src="error-panel.js"></script>
 */
(function() {
    // 存储错误信息
    var errors = [];
    
    // 创建错误面板
    function createPanel() {
        var style = document.createElement('style');
        style.textContent = `
            #error-btn {
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 44px;
                height: 44px;
                background: #333;
                border: none;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
            }
            #error-btn.has-error {
                background: #e94560;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            #error-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 500px;
                max-height: 70vh;
                background: #1a1a2e;
                border: 2px solid #e94560;
                border-radius: 8px;
                z-index: 10000;
                display: none;
                flex-direction: column;
            }
            #error-panel.visible {
                display: flex;
            }
            .error-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #2a2a3a;
            }
            .error-title {
                color: #e94560;
                font-weight: bold;
                font-size: 14px;
            }
            .error-close {
                background: none;
                border: none;
                color: #888;
                font-size: 20px;
                cursor: pointer;
            }
            .error-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                font-family: monospace;
                font-size: 12px;
            }
            .error-item {
                background: #0f0f1a;
                border-left: 3px solid #e94560;
                padding: 10px;
                margin-bottom: 10px;
                word-break: break-all;
            }
            .error-time {
                color: #666;
                font-size: 11px;
                margin-bottom: 4px;
            }
            .error-msg {
                color: #e0e0e0;
                line-height: 1.5;
            }
            .error-empty {
                color: #666;
                text-align: center;
                padding: 40px;
            }
            .error-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                z-index: 9999;
                display: none;
            }
            .error-overlay.visible {
                display: block;
            }
        `;
        document.head.appendChild(style);
        
        // 按钮
        var btn = document.createElement('button');
        btn.id = 'error-btn';
        btn.innerHTML = '🐛';
        btn.onclick = togglePanel;
        document.body.appendChild(btn);
        
        // 遮罩
        var overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        overlay.onclick = togglePanel;
        document.body.appendChild(overlay);
        
        // 面板
        var panel = document.createElement('div');
        panel.id = 'error-panel';
        panel.innerHTML = `
            <div class="error-header">
                <span class="error-title">⚠️ 错误信息 (${errors.length})</span>
                <button class="error-close" onclick="toggleErrorPanel()">×</button>
            </div>
            <div class="error-list" id="error-list">
                <div class="error-empty">暂无错误信息</div>
            </div>
        `;
        document.body.appendChild(panel);
    }
    
    // 切换面板显示
    window.toggleErrorPanel = function() {
        var panel = document.getElementById('error-panel');
        var overlay = document.querySelector('.error-overlay');
        var isVisible = panel.classList.contains('visible');
        
        panel.classList.toggle('visible', !isVisible);
        overlay.classList.toggle('visible', !isVisible);
        
        if (!isVisible) {
            renderErrors();
        }
    };
    
    function togglePanel() {
        window.toggleErrorPanel();
    }
    
    // 添加错误
    function addError(msg, source, line, col, err) {
        var error = {
            time: new Date().toLocaleTimeString(),
            message: msg,
            source: source,
            line: line,
            col: col,
            stack: err && err.stack ? err.stack : ''
        };
        
        errors.push(error);
        
        // 更新按钮状态
        var btn = document.getElementById('error-btn');
        if (btn) {
            btn.classList.add('has-error');
            btn.innerHTML = '⚠️';
        }
        
        // 如果面板打开，实时更新
        var panel = document.getElementById('error-panel');
        if (panel && panel.classList.contains('visible')) {
            renderErrors();
        }
    }
    
    // 渲染错误列表
    function renderErrors() {
        var list = document.getElementById('error-list');
        var title = document.querySelector('.error-title');
        
        if (!list) return;
        
        if (title) {
            title.textContent = '⚠️ 错误信息 (' + errors.length + ')';
        }
        
        if (errors.length === 0) {
            list.innerHTML = '<div class="error-empty">暂无错误信息</div>';
            return;
        }
        
        list.innerHTML = errors.map(function(err) {
            var location = err.line ? ' (行 ' + err.line + ')' : '';
            var stackHtml = err.stack ? '<div style="margin-top:8px;color:#666;font-size:11px;">' + err.stack.replace(/\n/g, '<br>') + '</div>' : '';
            
            return '<div class="error-item">' +
                '<div class="error-time">' + err.time + location + '</div>' +
                '<div class="error-msg">' + err.message + '</div>' +
                stackHtml +
            '</div>';
        }).join('');
        
        // 滚动到底部
        list.scrollTop = list.scrollHeight;
    }
    
    // 捕获全局错误
    window.onerror = function(msg, source, line, col, err) {
        addError(msg, source, line, col, err);
        return false;
    };
    
    // 捕获未处理的 Promise 错误
    window.addEventListener('unhandledrejection', function(e) {
        addError('Promise 错误: ' + e.reason, '', 0, 0, null);
    });
    
    // 捕获资源加载错误
    window.addEventListener('error', function(e) {
        if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'IMG')) {
            addError('资源加载失败: ' + (e.target.src || e.target.href), '', 0, 0, null);
        }
    }, true);
    
    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createPanel);
    } else {
        createPanel();
    }
})();
