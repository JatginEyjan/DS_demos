/**
 * DebugPanel - 通用错误调试面板
 * 一个可复用的浏览器错误捕获和显示组件
 * 
 * 使用方法:
 * 1. 引入: <script src="debug-panel.js"></script>
 * 2. 完成！自动捕获并显示错误
 * 
 * 高级用法:
 * DebugPanel.config({ position: 'bottom-right', theme: 'dark' });
 * DebugPanel.log('自定义日志');
 * DebugPanel.clear();
 */
(function(global) {
    'use strict';
    
    // 配置
    var config = {
        position: 'bottom-right',  // bottom-right, bottom-left, top-right, top-left
        theme: 'dark',             // dark, light
        maxErrors: 50,             // 最大保存错误数
        autoShow: false,           // 错误发生时自动显示面板
        captureConsole: true,      // 捕获 console.error
        persist: false             // 是否持久化到 localStorage
    };
    
    // 存储错误和日志
    var errors = [];
    var logs = [];
    var isInitialized = false;
    var panelVisible = false;
    
    // 主题配色
    var themes = {
        dark: {
            bg: '#1a1a2e',
            border: '#e94560',
            text: '#e0e0e0',
            textSecondary: '#888',
            errorBg: '#0f0f1a',
            button: '#333',
            buttonError: '#e94560'
        },
        light: {
            bg: '#fff',
            border: '#e94560',
            text: '#333',
            textSecondary: '#666',
            errorBg: '#f8f8f8',
            button: '#ddd',
            buttonError: '#e94560'
        }
    };
    
    // 创建面板
    function createPanel() {
        if (isInitialized) return;
        isInitialized = true;
        
        var theme = themes[config.theme] || themes.dark;
        var pos = getPositionStyles(config.position);
        
        // 样式
        var style = document.createElement('style');
        style.id = 'debug-panel-style';
        style.textContent = `
            #debug-panel-btn {
                position: fixed;
                ${pos.button}
                width: 44px;
                height: 44px;
                background: ${theme.button};
                border: 2px solid ${theme.border};
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            #debug-panel-btn:hover {
                transform: scale(1.1);
            }
            #debug-panel-btn.has-error {
                background: ${theme.buttonError};
                animation: debugPulse 2s infinite;
            }
            @keyframes debugPulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(233,69,96,0.4); }
                50% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(233,69,96,0); }
            }
            #debug-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                background: ${theme.bg};
                border: 2px solid ${theme.border};
                border-radius: 12px;
                z-index: 100000;
                display: none;
                flex-direction: column;
                opacity: 0;
                transition: all 0.3s;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }
            #debug-panel.visible {
                display: flex;
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid ${theme.border};
            }
            .debug-title {
                color: ${theme.border};
                font-weight: bold;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .debug-actions {
                display: flex;
                gap: 8px;
            }
            .debug-btn {
                background: ${theme.errorBg};
                border: 1px solid ${theme.border};
                color: ${theme.text};
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            .debug-btn:hover {
                background: ${theme.border};
                color: #fff;
            }
            .debug-close {
                background: none;
                border: none;
                color: ${theme.textSecondary};
                font-size: 24px;
                cursor: pointer;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .debug-close:hover {
                color: ${theme.border};
            }
            .debug-tabs {
                display: flex;
                border-bottom: 1px solid ${theme.border};
            }
            .debug-tab {
                flex: 1;
                padding: 12px;
                background: none;
                border: none;
                color: ${theme.textSecondary};
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            .debug-tab.active {
                color: ${theme.text};
                border-bottom: 2px solid ${theme.border};
            }
            .debug-content {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 12px;
            }
            .debug-item {
                background: ${theme.errorBg};
                border-left: 3px solid ${theme.border};
                padding: 12px;
                margin-bottom: 10px;
                border-radius: 0 4px 4px 0;
                word-break: break-all;
                line-height: 1.6;
            }
            .debug-item.log { border-left-color: #3498db; }
            .debug-item.warn { border-left-color: #f39c12; }
            .debug-item.info { border-left-color: #27ae60; }
            .debug-meta {
                color: ${theme.textSecondary};
                font-size: 11px;
                margin-bottom: 6px;
                display: flex;
                gap: 12px;
            }
            .debug-msg {
                color: ${theme.text};
            }
            .debug-stack {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid ${theme.border};
                color: ${theme.textSecondary};
                font-size: 11px;
                white-space: pre-wrap;
            }
            .debug-empty {
                color: ${theme.textSecondary};
                text-align: center;
                padding: 60px 20px;
            }
            .debug-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                z-index: 99999;
                display: none;
                opacity: 0;
                transition: opacity 0.3s;
            }
            .debug-overlay.visible {
                display: block;
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
        
        // 按钮
        var btn = document.createElement('button');
        btn.id = 'debug-panel-btn';
        btn.innerHTML = '🐛';
        btn.title = '调试面板';
        btn.onclick = togglePanel;
        document.body.appendChild(btn);
        
        // 遮罩
        var overlay = document.createElement('div');
        overlay.className = 'debug-overlay';
        overlay.onclick = togglePanel;
        document.body.appendChild(overlay);
        
        // 面板
        var panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-header">
                <span class="debug-title">🐛 调试面板</span>
                <div class="debug-actions">
                    <button class="debug-btn" onclick="DebugPanel.clear()">清空</button>
                    <button class="debug-btn" onclick="DebugPanel.copyAll()">复制全部</button>
                    <button class="debug-close" onclick="DebugPanel.toggle()">×</button>
                </div>
            </div>
            <div class="debug-tabs">
                <button class="debug-tab active" onclick="DebugPanel.switchTab('errors')">错误 (${errors.length})</button>
                <button class="debug-tab" onclick="DebugPanel.switchTab('logs')">日志 (${logs.length})</button>
            </div>
            <div class="debug-content" id="debug-content">
                <div class="debug-empty">暂无错误信息</div>
            </div>
        `;
        document.body.appendChild(panel);
    }
    
    // 获取位置样式
    function getPositionStyles(pos) {
        var positions = {
            'bottom-right': 'bottom: 20px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;',
            'top-right': 'top: 20px; right: 20px;',
            'top-left': 'top: 20px; left: 20px;'
        };
        return { button: positions[pos] || positions['bottom-right'] };
    }
    
    // 切换面板
    function togglePanel() {
        var panel = document.getElementById('debug-panel');
        var overlay = document.querySelector('.debug-overlay');
        
        if (!panel) return;
        
        panelVisible = !panelVisible;
        panel.classList.toggle('visible', panelVisible);
        overlay.classList.toggle('visible', panelVisible);
        
        if (panelVisible) {
            renderContent();
        }
    }
    
    // 切换标签
    function switchTab(tab) {
        document.querySelectorAll('.debug-tab').forEach(function(el, i) {
            el.classList.toggle('active', (tab === 'errors' && i === 0) || (tab === 'logs' && i === 1));
        });
        renderContent(tab);
    }
    
    // 渲染内容
    function renderContent(activeTab) {
        var content = document.getElementById('debug-content');
        var tabs = document.querySelectorAll('.debug-tab');
        var isErrors = !activeTab || tabs[0].classList.contains('active');
        
        // 更新标签计数
        if (tabs[0]) tabs[0].textContent = '错误 (' + errors.length + ')';
        if (tabs[1]) tabs[1].textContent = '日志 (' + logs.length + ')';
        
        var items = isErrors ? errors : logs;
        
        if (items.length === 0) {
            content.innerHTML = '<div class="debug-empty">暂无' + (isErrors ? '错误' : '日志') + '信息</div>';
            return;
        }
        
        content.innerHTML = items.map(function(item) {
            var typeClass = item.type || 'error';
            var location = item.line ? '行 ' + item.line : '';
            var source = item.source ? item.source.split('/').pop() : '';
            
            return '<div class="debug-item ' + typeClass + '">' +
                '<div class="debug-meta">' +
                    '<span>' + item.time + '</span>' +
                    (location ? '<span>' + location + '</span>' : '') +
                    (source ? '<span>' + source + '</span>' : '') +
                '</div>' +
                '<div class="debug-msg">' + escapeHtml(item.message) + '</div>' +
                (item.stack ? '<div class="debug-stack">' + escapeHtml(item.stack) + '</div>' : '') +
            '</div>';
        }).join('');
        
        content.scrollTop = content.scrollHeight;
    }
    
    // HTML转义
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 添加错误
    function addError(msg, source, line, col, err, type) {
        var error = {
            type: type || 'error',
            time: new Date().toLocaleTimeString(),
            message: msg,
            source: source,
            line: line,
            col: col,
            stack: err && err.stack ? err.stack : ''
        };
        
        errors.push(error);
        
        // 限制数量
        if (errors.length > config.maxErrors) {
            errors.shift();
        }
        
        // 持久化
        if (config.persist) {
            saveToStorage();
        }
        
        // 更新按钮
        var btn = document.getElementById('debug-panel-btn');
        if (btn && type !== 'log') {
            btn.classList.add('has-error');
            btn.innerHTML = '⚠️';
        }
        
        // 自动显示
        if (config.autoShow && type !== 'log') {
            var panel = document.getElementById('debug-panel');
            if (panel && !panel.classList.contains('visible')) {
                togglePanel();
            }
        }
        
        // 实时更新
        if (panelVisible) {
            renderContent();
        }
        
        return error;
    }
    
    // 保存到存储
    function saveToStorage() {
        try {
            localStorage.setItem('debug-panel-errors', JSON.stringify(errors));
            localStorage.setItem('debug-panel-logs', JSON.stringify(logs));
        } catch(e) {}
    }
    
    // 从存储加载
    function loadFromStorage() {
        try {
            var savedErrors = localStorage.getItem('debug-panel-errors');
            var savedLogs = localStorage.getItem('debug-panel-logs');
            if (savedErrors) errors = JSON.parse(savedErrors);
            if (savedLogs) logs = JSON.parse(savedLogs);
        } catch(e) {}
    }
    
    // 捕获全局错误
    function setupErrorHandlers() {
        // JS错误
        var originalOnError = window.onerror;
        window.onerror = function(msg, source, line, col, err) {
            addError(msg, source, line, col, err, 'error');
            if (originalOnError) return originalOnError.apply(this, arguments);
            return false;
        };
        
        // Promise错误
        window.addEventListener('unhandledrejection', function(e) {
            addError('未处理的 Promise: ' + e.reason, '', 0, 0, null, 'error');
        });
        
        // 资源加载错误
        window.addEventListener('error', function(e) {
            if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'IMG' || e.target.tagName === 'LINK')) {
                var src = e.target.src || e.target.href;
                addError('资源加载失败: ' + src, src, 0, 0, null, 'error');
            }
        }, true);
        
        // 捕获 console.error
        if (config.captureConsole) {
            var originalError = console.error;
            console.error = function() {
                var msg = Array.from(arguments).map(function(a) {
                    return typeof a === 'object' ? JSON.stringify(a) : String(a);
                }).join(' ');
                addError(msg, '', 0, 0, null, 'error');
                originalError.apply(console, arguments);
            };
            
            var originalWarn = console.warn;
            console.warn = function() {
                var msg = Array.from(arguments).map(function(a) {
                    return typeof a === 'object' ? JSON.stringify(a) : String(a);
                }).join(' ');
                addError(msg, '', 0, 0, null, 'warn');
                originalWarn.apply(console, arguments);
            };
            
            var originalLog = console.log;
            console.log = function() {
                var msg = Array.from(arguments).map(function(a) {
                    return typeof a === 'object' ? JSON.stringify(a) : String(a);
                }).join(' ');
                logs.push({
                    type: 'log',
                    time: new Date().toLocaleTimeString(),
                    message: msg
                });
                if (logs.length > config.maxErrors) logs.shift();
                if (panelVisible) renderContent();
                originalLog.apply(console, arguments);
            };
        }
    }
    
    // 公开API
    var DebugPanel = {
        // 初始化
        init: function(options) {
            if (options) {
                Object.assign(config, options);
            }
            if (config.persist) {
                loadFromStorage();
            }
            createPanel();
            setupErrorHandlers();
            return this;
        },
        
        // 配置
        config: function(options) {
            Object.assign(config, options);
            return this;
        },
        
        // 切换面板
        toggle: function() {
            togglePanel();
            return this;
        },
        
        // 切换标签
        switchTab: function(tab) {
            switchTab(tab);
            return this;
        },
        
        // 添加日志
        log: function(msg, type) {
            addError(String(msg), '', 0, 0, null, type || 'log');
            return this;
        },
        
        // 清空
        clear: function() {
            errors = [];
            logs = [];
            var btn = document.getElementById('debug-panel-btn');
            if (btn) {
                btn.classList.remove('has-error');
                btn.innerHTML = '🐛';
            }
            renderContent();
            if (config.persist) saveToStorage();
            return this;
        },
        
        // 复制全部
        copyAll: function() {
            var text = errors.map(function(e) {
                return '[' + e.time + '] ' + e.message + (e.stack ? '\n' + e.stack : '');
            }).join('\n---\n');
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            } else {
                var textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            
            alert('已复制 ' + errors.length + ' 条错误信息到剪贴板');
            return this;
        },
        
        // 获取错误列表
        getErrors: function() {
            return errors.slice();
        },
        
        // 销毁
        destroy: function() {
            var panel = document.getElementById('debug-panel');
            var btn = document.getElementById('debug-panel-btn');
            var overlay = document.querySelector('.debug-overlay');
            var style = document.getElementById('debug-panel-style');
            
            if (panel) panel.remove();
            if (btn) btn.remove();
            if (overlay) overlay.remove();
            if (style) style.remove();
            
            isInitialized = false;
            panelVisible = false;
        }
    };
    
    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            DebugPanel.init();
        });
    } else {
        DebugPanel.init();
    }
    
    // 暴露到全局
    global.DebugPanel = DebugPanel;
    
})(window);
