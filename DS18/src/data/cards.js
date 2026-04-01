import { createConsumableCard } from '../cards/ConsumableCard.js';
import { createEquipmentCard } from '../cards/EquipmentCard.js';
import { createEventCard } from '../cards/EventCard.js';
import { createNPCCard } from '../cards/NPCCard.js';
import { createRoomCard } from '../cards/RoomCard.js';
import { createTimeCard } from '../cards/TimeCard.js';

const QUALITY_ORDER = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4
};

export const QUALITY_LABELS = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
};

export const QUALITY_CLASS = {
  common: 'quality-common',
  rare: 'quality-rare',
  epic: 'quality-epic',
  legendary: 'quality-legendary'
};

export const SCALING_VALUE = {
  S: 1.2,
  A: 1,
  B: 0.75,
  C: 0.5,
  D: 0.25,
  E: 0.1
};

export const CARD_TEMPLATES = [
  createRoomCard({
    id: 'room_abandoned_cemetery',
    quality: 'common',
    name: '废弃墓地',
    description: '魂火早已熄灭的墓园，白日埋骨，夜晚苏醒。',
    duration: 3,
    embedCapacity: { npc: 1, event: 1 },
    comboTags: ['undead'],
    day: { power: 42, hp: 120, souls: [30, 50], loot: ['material_shard'] },
    night: { power: 64, hp: 170, souls: [60, 90], loot: ['material_shard'] }
  }),
  createRoomCard({
    id: 'room_forest_path',
    quality: 'common',
    name: '林间小路',
    description: '短途探索，收益不高，但经常能捡到草药。',
    duration: 2,
    embedCapacity: { npc: 1, event: 1 },
    comboTags: ['wild'],
    day: { power: 28, hp: 85, souls: [15, 25], loot: ['consumable_green_blossom'] },
    night: { power: 46, hp: 120, souls: [35, 50], loot: ['consumable_green_blossom'] }
  }),
  createRoomCard({
    id: 'room_undead_settlement',
    quality: 'rare',
    name: '不死聚落',
    description: '高收益的不死人据点，和墓地相邻时会触发不死系连锁。',
    duration: 5,
    embedCapacity: { npc: 1, event: 1 },
    comboTags: ['undead', 'village'],
    day: { power: 70, hp: 210, souls: [80, 120], loot: ['weapon_greatsword'] },
    night: { power: 98, hp: 280, souls: [120, 180], loot: ['weapon_greatsword', 'armor_chainmail'] }
  }),
  createRoomCard({
    id: 'room_mine',
    quality: 'rare',
    name: '矿洞',
    description: '产出强化材料的关键地点，嵌入铁匠可以立刻强化武器。',
    duration: 4,
    embedCapacity: { npc: 1, event: 1 },
    comboTags: ['ore'],
    day: { power: 52, hp: 150, souls: [40, 60], loot: ['material_shard', 'material_shard'] },
    night: { power: 78, hp: 210, souls: [80, 100], loot: ['material_chunk'] }
  }),
  createRoomCard({
    id: 'room_old_church',
    quality: 'rare',
    name: '古老教堂',
    description: '白天是安全回复点，夜晚则会被堕落牧师占据。',
    duration: 3,
    embedCapacity: { npc: 1, event: 1 },
    comboTags: ['faith'],
    day: { power: 8, hp: 0, souls: [12, 20], loot: ['consumable_magic_resin'] },
    night: { power: 60, hp: 145, souls: [60, 80], loot: ['consumable_magic_resin', 'armor_chainmail'] }
  }),
  createRoomCard({
    id: 'room_starter_village',
    quality: 'common',
    name: '新手村',
    description: '风险不高，适合补充基础资源和商店机会。',
    duration: 3,
    embedCapacity: { npc: 1, event: 1 },
    comboTags: ['village'],
    day: { power: 26, hp: 90, souls: [20, 30], loot: ['npc_merchant'] },
    night: { power: 44, hp: 118, souls: [40, 55], loot: ['consumable_flame_jar'] }
  }),
  createTimeCard({
    id: 'time_bonfire',
    quality: 'common',
    name: '篝火',
    description: '恢复生命、刷新治疗瓶，并在结算阶段开放升级。',
    duration: 2
  }),
  createTimeCard({
    id: 'time_return',
    quality: 'common',
    name: '返回卡',
    description: '立即结束当天行程，带着已有收益安全撤离。',
    duration: 0
  }),
  createNPCCard({
    id: 'npc_fire_keeper',
    quality: 'rare',
    name: '防火女',
    description: '结算阶段可消耗灵魂升级一次属性。',
    cooldownDays: 1
  }),
  createNPCCard({
    id: 'npc_blacksmith',
    quality: 'rare',
    name: '铁匠',
    description: '若你有足够材料，则在结算阶段可以强化武器。',
    cooldownDays: 1
  }),
  createNPCCard({
    id: 'npc_pilgrim',
    quality: 'common',
    name: '巡礼者',
    description: '本房间伤害提升 15%，并带回一张普通事件卡。',
    cooldownDays: 1
  }),
  createNPCCard({
    id: 'npc_merchant',
    quality: 'common',
    name: '商人',
    description: '结算阶段开启三件商品的简易商店。',
    cooldownDays: 1
  }),
  createEventCard({
    id: 'event_trapped_chest',
    quality: 'common',
    name: '宝箱陷阱',
    description: '骰子 >= 4 获得稀有卡，失败则掉血。'
  }),
  createEventCard({
    id: 'event_hidden_passage',
    quality: 'common',
    name: '隐藏通道',
    description: '跳过战斗，直接获得固定灵魂。'
  }),
  createEventCard({
    id: 'event_soul_vortex',
    quality: 'common',
    name: '灵魂漩涡',
    description: '灵魂掉落翻倍，但怪物伤害更高。'
  }),
  createEventCard({
    id: 'event_dragon_fire',
    quality: 'rare',
    name: '巨龙喷火',
    description: '怪物先吃一轮重伤，勇者也会被余焰灼伤。'
  }),
  createEventCard({
    id: 'event_mystic_altar',
    quality: 'rare',
    name: '神秘祭坛',
    description: '高风险高收益骰子事件。'
  }),
  createEventCard({
    id: 'event_hero_trial',
    quality: 'rare',
    name: '勇者试炼',
    description: '房间末尾追加一波精英战，并提供额外结算奖励。'
  }),
  createEquipmentCard({
    id: 'weapon_longsword',
    quality: 'common',
    type: 'weapon',
    name: '长剑',
    description: '均衡的起始武器。',
    baseAttack: 30,
    scaling: { strength: 'C', dexterity: 'D' },
    requirements: { strength: 10, dexterity: 8 },
    maxUpgradeLevel: 5
  }),
  createEquipmentCard({
    id: 'weapon_greatsword',
    quality: 'rare',
    type: 'weapon',
    name: '大剑',
    description: '慢但痛，对力量成长很友好。',
    baseAttack: 55,
    scaling: { strength: 'B', dexterity: 'E' },
    requirements: { strength: 18, dexterity: 10 },
    maxUpgradeLevel: 8
  }),
  createEquipmentCard({
    id: 'weapon_scimitar',
    quality: 'rare',
    type: 'weapon',
    name: '弯刀',
    description: '命中节奏快，暴击率更好。',
    baseAttack: 35,
    scaling: { dexterity: 'B', strength: 'D' },
    requirements: { dexterity: 16, strength: 10 },
    maxUpgradeLevel: 8
  }),
  createEquipmentCard({
    id: 'armor_knight',
    quality: 'common',
    type: 'armor',
    name: '骑士铠甲',
    description: '标准骑士套，防御稳定。',
    baseDefense: 15
  }),
  createEquipmentCard({
    id: 'armor_chainmail',
    quality: 'rare',
    type: 'armor',
    name: '锁链甲',
    description: '更高护甲，并偶尔能完全格挡伤害。',
    baseDefense: 25,
    requirements: { strength: 14 }
  }),
  createConsumableCard({
    id: 'consumable_flame_jar',
    quality: 'common',
    name: '火焰壶',
    description: 'Boss 战可打断深渊风暴，对当前敌群造成火焰伤害。'
  }),
  createConsumableCard({
    id: 'consumable_green_blossom',
    quality: 'common',
    name: '绿花草',
    description: '回复 30% 最大生命。'
  }),
  createConsumableCard({
    id: 'consumable_magic_resin',
    quality: 'rare',
    name: '魔力树脂',
    description: '接下来一个房间或一轮 Boss 战中攻击力 +40%。'
  }),
  {
    id: 'material_shard',
    category: 'resource',
    type: 'material',
    quality: 'common',
    name: '普通石',
    description: '强化武器 +1 至 +3 所需材料。'
  },
  {
    id: 'material_chunk',
    category: 'resource',
    type: 'material',
    quality: 'rare',
    name: '大块石',
    description: '强化武器 +4 至 +6 所需材料。'
  }
];

export const CARD_TEMPLATE_MAP = Object.fromEntries(
  CARD_TEMPLATES.map((definition) => [definition.id, definition])
);

export function getTemplate(templateId) {
  return CARD_TEMPLATE_MAP[templateId] || null;
}

export function createCardInstance(templateId, serial) {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  return {
    id: `card_${serial}`,
    templateId,
    currentCooldown: 0,
    upgradeLevel: template.type === 'weapon' ? 0 : undefined
  };
}

export function canEmbedIntoRoom(embedTemplateId, roomTemplateId) {
  const embed = getTemplate(embedTemplateId);
  const room = getTemplate(roomTemplateId);
  if (!embed || !room || room.type !== 'room') return false;
  if (embed.type !== 'npc' && embed.type !== 'event') return false;
  return QUALITY_ORDER[embed.quality] <= QUALITY_ORDER[room.quality];
}
