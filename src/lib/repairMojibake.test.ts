import { describe, expect, it } from 'vitest';
import { repairMojibake } from './repairMojibake';
import en from '../messages/en.json';
import ru from '../messages/ru.json';
import uz from '../messages/uz.json';

describe('repairMojibake', () => {
  it('repairs every reversible legacy encoding layer for Russian menu labels', () => {
    const menuCopy = repairMojibake(ru);
    expect(menuCopy.common.language).toBe('\u042f\u0437\u044b\u043a');
    expect(menuCopy.sidebar.dashboard).toBe('\u041e\u0431\u0437\u043e\u0440 \u0431\u0438\u0437\u043d\u0435\u0441\u0430');
    expect(repairMojibake('РџСЂРёРјРµСЂРѕС‡РЅР°СЏ')).toBe('\u041f\u0440\u0438\u043c\u0435\u0440\u043e\u0447\u043d\u0430\u044f');
  });

  it('repairs Russian text and punctuation from the legacy locale bundle', () => {
    expect(repairMojibake('РџСЂРёРјРµСЂРѕС‡РЅР°СЏ')).toBe('Примерочная');
    expect(repairMojibake('РџСЂРѕРІРµСЂРєР°вЂ¦')).toBe('Проверка…');
  });

  it('preserves valid English, Uzbek and unrelated values', () => {
    expect(repairMojibake('Virtual fitting room')).toBe('Virtual fitting room');
    expect(repairMojibake('Kiyib ko‘rish')).toBe('Kiyib ko‘rish');
    expect(repairMojibake(42)).toBe(42);
  });

  it('provides sidebar collapse labels in all supported locales', () => {
    expect(ru.common.collapse).toBe('Свернуть меню');
    expect(ru.common.expand).toBe('Развернуть меню');
    expect(ru.common.resizeSidebar).toBe('Изменить ширину меню');
    expect(ru.common.resizeSidebarHint).toBe('Потяните, чтобы изменить ширину меню');
    expect(uz.common.collapse).toBe("Menyuni yig'ish");
    expect(uz.common.expand).toBe('Menyuni ochish');
    expect(uz.common.resizeSidebar).toBe("Yon menyu kengligini o'zgartirish");
    expect(uz.common.resizeSidebarHint).toBe('Enini o\'zgartirish uchun torting');
    expect(en.common.collapse).toBe('Collapse sidebar');
    expect(en.common.expand).toBe('Expand sidebar');
    expect(en.common.resizeSidebar).toBe('Resize sidebar');
    expect(en.common.resizeSidebarHint).toBe('Drag to change sidebar width');
  });
});
