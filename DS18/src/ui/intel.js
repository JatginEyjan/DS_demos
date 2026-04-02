import { getTemplate } from '../data/cards.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getRoomModeInfo(mode) {
  return {
    label: mode === 'night' ? '夜晚迷雾' : mode === 'twilight' ? '跨昼夜' : mode === 'utility' ? '功能卡' : '白昼区域',
    tone: mode === 'night' ? 'fog' : mode === 'twilight' ? 'twilight' : mode === 'utility' ? 'utility' : 'day'
  };
}

export function getDangerLevel(power = 0, hp = 0) {
  return clamp(Math.round((power * 0.6 + hp * 0.12) / 30), 1, 5);
}

export function getRewardLevel(soulsRange = [0, 0]) {
  const average = ((soulsRange[0] || 0) + (soulsRange[1] || 0)) / 2;
  return clamp(Math.round(average / 60), 1, 5);
}

export function renderStars(level, max = 5) {
  return Array.from({ length: max }, (_, index) => index < level ? '★' : '☆').join('');
}

export function describeLoot(templateIds = [], fogged = false) {
  if (!templateIds.length) {
    return fogged ? ['未知'] : ['无已知掉落'];
  }
  if (fogged) {
    return templateIds.map(() => '？？？');
  }
  return templateIds.map((templateId) => getTemplate(templateId)?.name || templateId);
}
