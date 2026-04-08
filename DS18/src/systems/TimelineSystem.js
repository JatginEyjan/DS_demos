import { EXECUTION_MS_PER_HOUR } from '../config/constants.js';
import { getTemplate } from '../data/cards.js';
import { sum } from '../utils/formula.js';

export class TimelineSystem {
  constructor(session) {
    this.session = session;
  }

  getUsedHours(day) {
    return sum((this.session.state.layouts[day] || []).map((slot) => getTemplate(slot.card.templateId)?.duration || 0));
  }

  getSlotTimeSegments(day) {
    let elapsed = 0;
    const limit = this.session.state.hero.enduranceHours / 2;
    return (this.session.state.layouts[day] || []).map((slot) => {
      const duration = getTemplate(slot.card.templateId)?.duration || 0;
      const start = elapsed;
      const end = elapsed + duration;
      elapsed = end;
      return {
        slot,
        start,
        end,
        mode:
          duration === 0
            ? 'utility'
            : start >= limit
              ? 'night'
              : end > limit
                ? 'twilight'
                : 'day'
      };
    });
  }

  startExecution() {
    const slots = this.session.state.layouts[this.session.state.day] || [];
    if (slots.length === 0) {
      return { ok: false, reason: '至少放入一张路程卡才能开始执行。' };
    }

    this.session.state.scene = 'execution';
    this.session.state.execution = {
      slotIndex: 0,
      slotElapsedMs: 0,
      slotHoursResolved: 0,
      finished: false
    };
    this.session.state.dayContext = this.session.createDayContext();
    this.session.log(`第 ${this.session.state.day} 天执行开始。勇者踏上由你编排的命运时间轴。`, 'story');
    this.session.persist();
    return { ok: true };
  }

  advance(deltaMs) {
    const execution = this.session.state.execution;
    const slots = this.session.state.layouts[this.session.state.day] || [];
    if (this.session.state.scene !== 'execution' || !execution || execution.finished) return false;

    const currentSlot = slots[execution.slotIndex];
    if (!currentSlot) {
      this.session.finishDay('day_end');
      return true;
    }

    const template = getTemplate(currentSlot.card.templateId);
    if (!template) return false;
    if (template.duration === 0) {
      this.resolveCurrentSlot();
      return true;
    }

    execution.slotElapsedMs += deltaMs;
    const requiredMs = template.duration * EXECUTION_MS_PER_HOUR;
    if (execution.slotElapsedMs >= requiredMs) {
      this.resolveCurrentSlot();
      return true;
    }

    execution.slotHoursResolved = (execution.slotElapsedMs / requiredMs) * template.duration;
    return true;
  }

  resolveCurrentSlot() {
    const execution = this.session.state.execution;
    const slots = this.session.state.layouts[this.session.state.day] || [];
    const slot = slots[execution.slotIndex];
    if (!slot) {
      this.session.finishDay('day_end');
      return;
    }

    const template = getTemplate(slot.card.templateId);
    const segments = this.getSlotTimeSegments(this.session.state.day);
    const segment = segments[execution.slotIndex];
    const context = {
      startHour: segment?.start || 0,
      endHour: segment?.end || segment?.start || 0,
      mode: segment?.mode || 'day',
      slotIndex: execution.slotIndex
    };

    this.session.eventBus.emit('timeline:slot_enter', {
      day: this.session.state.day,
      slotIndex: execution.slotIndex,
      templateId: slot.card.templateId,
      context
    });

    if (template.type === 'time') {
      this.resolveTimeSlot(template);
    } else if (template.type === 'room') {
      this.session.combatSystem.resolveRoomSlot(slot, context);
    }

    if (this.session.state.scene !== 'execution') return;

    execution.slotIndex += 1;
    execution.slotElapsedMs = 0;
    execution.slotHoursResolved = 0;

    if (execution.slotIndex >= slots.length) {
      this.session.finishDay('day_end');
    }

    this.session.heroSystem.syncDerivedStats();
    this.session.persist();
  }

  resolveTimeSlot(template) {
    if (template.id === 'time_bonfire') {
      this.session.state.dayContext.bonfireUsed = true;
      this.session.state.hero.currentHp = Math.min(
        this.session.state.hero.maxHp,
        this.session.state.hero.currentHp + Math.round(this.session.state.hero.maxHp * 0.3)
      );
      this.session.state.hero.flasks = this.session.state.hero.maxFlasks;
      this.session.log('篝火点燃。生命回复 30%，治疗瓶已补满，结算阶段可升级。', 'positive');
      this.session.state.dayContext.summary.push('篝火：回复生命并解锁升级。');
    }

    if (template.id === 'time_return') {
      this.session.log('返回卡生效。你决定带着已有收益立刻撤离。', 'warning');
      this.session.finishDay('return_card');
    }
  }
}
