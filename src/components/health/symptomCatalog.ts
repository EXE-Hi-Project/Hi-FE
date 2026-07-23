import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import {
  ArrowsClockwise,
  BatteryLow,
  BatteryWarning,
  BowlFood,
  Brain,
  CircleHalf,
  CirclesThree,
  CirclesThreePlus,
  Cloud,
  DotsThreeCircle,
  Drop,
  DropHalf,
  DropHalfBottom,
  DropSlash,
  Egg,
  FirstAid,
  FlowerLotus,
  HandPalm,
  HeartBreak,
  Heartbeat,
  Lightning,
  MoonStars,
  Palette,
  PersonArmsSpread,
  PersonSimple,
  Prohibit,
  Pulse,
  Smiley,
  SmileyAngry,
  SmileyNervous,
  SmileySad,
  SmileyXEyes,
  Sparkle,
  ThermometerHot,
  Toilet,
  ToiletPaper,
  WarningCircle,
  WarningDiamond,
  Wind,
} from '@phosphor-icons/react';
import type { SymptomDictionary } from '../../types/shared';

const normalizeKey = (value: string) => value
  .normalize('NFC')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('vi-VN');

const NAME_ALIASES = new Map<string, string>([
  ['spotted form', 'Dạng đốm'],
  ['spotting', 'Dạng đốm'],
  ['bệnh tĩnh', 'Bình tĩnh'],
  ['b�nh tĩnh', 'Bình tĩnh'],
  ['b?nh tĩnh', 'Bình tĩnh'],
  ['bÃ¬nh tÄ©nh', 'Bình tĩnh'],
]);

export function canonicalSymptomName(value: string) {
  const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  const key = normalizeKey(name);
  const directAlias = NAME_ALIASES.get(key);
  if (directAlias) return directAlias;

  if (/^b.nh tĩnh$/iu.test(key)) return 'Bình tĩnh';
  if (!name.includes('�')) return name;

  if (/^ch.*ng mặt/u.test(key)) return 'Chóng mặt';
  if (/^kh.*m đạo/u.test(key)) return 'Khô âm đạo';
  if (/^ng.*m đạo/u.test(key)) return 'Ngứa âm đạo';
  if (/^th.*m ăn/u.test(key)) return 'Thèm ăn';
  if (/^ti.*u chảy/u.test(key)) return 'Tiêu chảy';
  if (/^t.*o b.*n/u.test(key)) return 'Táo bón';
  if (/^bu.*n n.*n/u.test(key)) return 'Buồn nôn';
  if (/^d.*ng d.*nh/u.test(key)) return 'Dạng dính';
  if (/^kh.*ng c.* d.*ch/u.test(key)) return 'Không có dịch';
  if (/^nh.* l.*ng trắng trứng/u.test(key)) return 'Như lòng trắng trứng';
  if (/^trắng, v.*n c.*c/u.test(key)) return 'Trắng, vón cục';
  if (/^x.*m$/u.test(key)) return 'Xám';
  return name;
}

export function getSymptomDisplayName(symptom: SymptomDictionary) {
  return canonicalSymptomName(symptom.name);
}

export function getSymptomDisplayKey(symptom: SymptomDictionary) {
  return normalizeKey(getSymptomDisplayName(symptom));
}

export function dedupeSymptoms(symptoms: SymptomDictionary[], selectedSymptoms: Set<number>) {
  const byDisplayName = new Map<string, SymptomDictionary>();
  symptoms.forEach((symptom) => {
    const key = getSymptomDisplayKey(symptom);
    const current = byDisplayName.get(key);
    if (!current || selectedSymptoms.has(symptom.id)) {
      byDisplayName.set(key, symptom);
    }
  });
  return Array.from(byDisplayName.values());
}

const ICON_BY_NAME: Record<string, ComponentType<IconProps>> = {
  'Đau bụng': Pulse,
  'Đau đầu': Brain,
  'Mệt mỏi': BatteryLow,
  'Nổi mụn': CirclesThree,
  'Đau lưng': PersonSimple,
  'Ngực đau': Heartbeat,
  'Mất ngủ': MoonStars,
  'Chóng mặt': ArrowsClockwise,
  'Thèm ăn': BowlFood,
  'Ngứa âm đạo': HandPalm,
  'Khô âm đạo': DropSlash,
  'Đau vùng chậu': PersonArmsSpread,
  'Đau dữ dội': WarningCircle,
  'Chảy máu giữa kỳ': DropHalf,
  'Đau khi quan hệ': HeartBreak,
  'Đau khi tiểu tiện': DropHalfBottom,
  'Đau khi đại tiện': Toilet,
  'Sốt': ThermometerHot,
  'Choáng hoặc ngất': WarningDiamond,
  'Bình tĩnh': FlowerLotus,
  'Vui vẻ': Smiley,
  'Mạnh mẽ': Lightning,
  'Phấn chấn': Sparkle,
  'Thất thường': ArrowsClockwise,
  'Bực bội': SmileyAngry,
  'Buồn': SmileySad,
  'Lo lắng': SmileyNervous,
  'Thiếu năng lượng': BatteryWarning,
  'Buồn nôn': SmileyXEyes,
  'Đầy hơi': Wind,
  'Táo bón': Prohibit,
  'Tiêu chảy': ToiletPaper,
  'Không có dịch': DropSlash,
  'Trắng đục': Cloud,
  'Ẩm ướt': Drop,
  'Dạng dính': DropHalf,
  'Như lòng trắng trứng': Egg,
  'Dạng đốm': DotsThreeCircle,
  'Bất thường': WarningCircle,
  'Trắng, vón cục': CirclesThreePlus,
  'Xám': CircleHalf,
  'Dịch có mùi hôi': WarningDiamond,
  'Dịch đổi màu bất thường': Palette,
};

export function getSymptomIcon(symptom: SymptomDictionary) {
  const icon = ICON_BY_NAME[getSymptomDisplayName(symptom)];
  if (icon) return icon;
  if (symptom.category === 'EMOTIONAL') return Smiley;
  if (symptom.category === 'FLUID') return Drop;
  return FirstAid;
}
