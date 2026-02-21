/**
 * DS11 畸变系统配置模块
 * 定义所有畸变效果及其不同强度等级
 */

const MutationConfig = {
  // 畸变定义
  mutations: {
    // 正向畸变
    eye: {
      id: 'eye',
      name: '深渊之眼',
      icon: '👁️',
      type: 'positive',
      description: '可以透视迷雾',
      
      // 不同强度等级的效果
      effects: {
        weak: {
          revealFog: 1,      // 每N回合可透视1格
          cooldown: 2        // 冷却回合
        },
        normal: {
          revealFog: 1,
          cooldown: 1
        },
        strong: {
          revealFog: 2,
          cooldown: 1
        }
      }
    },
    
    sense: {
      id: 'sense',
      name: '资源嗅觉',
      icon: '🔍',
      type: 'positive',
      description: '发现火把的概率增加',
      
      effects: {
        weak: { torchChanceBonus: 0.15 },
        normal: { torchChanceBonus: 0.20 },
        strong: { torchChanceBonus: 0.30 }
      }
    },
    
    // 负向畸变
    heavy: {
      id: 'heavy',
      name: '沉重步伐',
      icon: '⚓',
      type: 'negative',
      description: '移动消耗额外火把',
      
      effects: {
        weak: { extraCost: 0 },
        normal: { extraCost: 1 },
        strong: { extraCost: 1, maxTorchPenalty: 2 }
      }
    },
    
    obsessive: {
      id: 'obsessive',
      name: '强迫症',
      icon: '🔄',
      type: 'negative',
      description: '必须揭示完所有格才能撤退',
      
      effects: {
        weak: { requireRevealPercent: 0.8 },
        normal: { requireRevealPercent: 1.0 },
        strong: { requireRevealPercent: 1.0, noRetreatOnLowTorch: true }
      }
    },
    
    // 彩蛋畸变
    whisper: {
      id: 'whisper',
      name: '低语理解',
      icon: '👂',
      type: 'easter',
      description: '偶尔听到格子的提示',
      
      effects: {
        weak: { hintChance: 0.15 },
        normal: { hintChance: 0.25 },
        strong: { hintChance: 0.40, preciseHint: true }
      }
    },
    
    // 新增畸变（扩展性）
    berserk: {
      id: 'berserk',
      name: '狂战士',
      icon: '⚔️',
      type: 'easter',
      description: '踩雷不再触发F3，但无法获得印记',
      
      effects: {
        weak: { noF3: true, noMark: true, torchBonus: 2 },
        normal: { noF3: true, noMark: true, torchBonus: 1 },
        strong: { noF3: true, noMark: true }
      }
    },
    
    alchemist: {
      id: 'alchemist',
      name: '炼金术师',
      icon: '⚗️',
      type: 'positive',
      description: '可以将2个印记转化为3个火把',
      
      effects: {
        weak: { markToTorchRatio: 0.5 },
        normal: { markToTorchRatio: 1.0 },
        strong: { markToTorchRatio: 1.5 }
      }
    }
  },
  
  // 获取随机畸变选择
  getRandomMutations(count = 3, excludeIds = []) {
    const allIds = Object.keys(this.mutations).filter(id => !excludeIds.includes(id));
    const shuffled = allIds.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(id => this.mutations[id]);
  },
  
  // 获取指定畸变的效果
  getEffect(mutationId, strength = 'normal') {
    const mutation = this.mutations[mutationId];
    if (!mutation) return null;
    return mutation.effects[strength] || mutation.effects.normal;
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MutationConfig;
}
