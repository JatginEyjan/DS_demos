/**
 * DS11 难度配置模块
 * 支持三种难度等级：简单/标准/困难
 */

const DifficultyConfig = {
  // 简单模式 - 新手友好
  easy: {
    name: '简单',
    description: '容错率高，适合学习机制',
    
    // 火把系统
    initialTorch: 7,
    maxTorch: 12,
    fogCost: 1,      // 普通迷雾格成本
    riftCost: 4,     // 深渊裂隙成本
    pollutedCost: 2, // 污染格成本
    
    // 资源获取
    torchChance: 0.45,      // 安全格火把出现概率
    torchAmountMin: 1,      // 火把堆最小数量
    torchAmountMax: 3,      // 火把堆最大数量
    f3TorchChance: 0.40,    // F3火把奖励概率
    
    // 网格生成
    mineRate: 0.15,         // 雷率
    riftRate: 0.10,         // 裂隙基础概率
    riftGuarantee: 4,       // 每N格保底裂隙
    
    // 核心机制
    coreAfter: 8,           // N格后出现核心
    coreChance: 0.25,       // 核心出现概率
    coreGuarantee: 16,      // 保底格数
    maxCells: 20,           // 迷雾格上限
    
    // F3/F4系统
    f3RevealCount: 2,       // F3强制揭示格数
    f3PollutionBlur: 0.30,  // 模糊污染概率
    f3PollutionHeavy: 0.30, // 沉重污染概率
    f3PollutionUnstable: 0.10, // 不稳定污染概率
    markCap: 5,             // 印记上限（触发畸变）
    
    // 畸变效果强度
    mutationStrength: 'weak' // weak/normal/strong
  },
  
  // 标准模式 - 平衡挑战
  normal: {
    name: '标准',
    description: '平衡挑战，需要规划',
    
    // 火把系统
    initialTorch: 6,
    maxTorch: 12,
    fogCost: 2,
    riftCost: 5,
    pollutedCost: 3,
    
    // 资源获取
    torchChance: 0.35,
    torchAmountMin: 1,
    torchAmountMax: 3,
    f3TorchChance: 0.30,
    
    // 网格生成
    mineRate: 0.18,
    riftRate: 0.10,
    riftGuarantee: 5,
    
    // 核心机制
    coreAfter: 10,
    coreChance: 0.20,
    coreGuarantee: 18,
    maxCells: 18,
    
    // F3/F4系统
    f3RevealCount: 3,
    f3PollutionBlur: 0.40,
    f3PollutionHeavy: 0.40,
    f3PollutionUnstable: 0.20,
    markCap: 3,
    
    // 畸变效果强度
    mutationStrength: 'normal'
  },
  
  // 困难模式 - 硬核挑战
  hard: {
    name: '困难',
    description: '高风险高回报，需要精通机制',
    
    // 火把系统
    initialTorch: 5,
    maxTorch: 10,
    fogCost: 2,
    riftCost: 5,
    pollutedCost: 3,
    
    // 资源获取
    torchChance: 0.25,
    torchAmountMin: 1,
    torchAmountMax: 2,
    f3TorchChance: 0.20,
    
    // 网格生成
    mineRate: 0.22,
    riftRate: 0.08,
    riftGuarantee: 6,
    
    // 核心机制
    coreAfter: 12,
    coreChance: 0.15,
    coreGuarantee: null, // 无保底
    maxCells: 15,
    
    // F3/F4系统
    f3RevealCount: 4,
    f3PollutionBlur: 0.50,
    f3PollutionHeavy: 0.40,
    f3PollutionUnstable: 0.30,
    markCap: 2,
    
    // 畸变效果强度
    mutationStrength: 'strong'
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DifficultyConfig;
}
