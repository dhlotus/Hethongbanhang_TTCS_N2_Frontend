/**
 * Tiện ích chuyển đổi số tiền thành chữ Tiếng Việt (chuẩn hóa kế toán B2B)
 */

const DIGITS = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];

const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

const readThreeDigits = (threeDigits: number, showZeroHundred: boolean): string => {
  const hundred = Math.floor(threeDigits / 100);
  const remainder = threeDigits % 100;
  const ten = Math.floor(remainder / 10);
  const unit = remainder % 10;

  const result: string[] = [];

  if (hundred > 0 || showZeroHundred) {
    result.push(`${DIGITS[hundred]} trăm`);
  }

  if (ten > 1) {
    result.push(`${DIGITS[ten]} mươi`);
    if (unit === 1) {
      result.push('mốt');
    } else if (unit === 5) {
      result.push('lăm');
    } else if (unit > 0) {
      result.push(DIGITS[unit]);
    }
  } else if (ten === 1) {
    result.push('mười');
    if (unit === 5) {
      result.push('lăm');
    } else if (unit > 0) {
      result.push(DIGITS[unit]);
    }
  } else if (ten === 0 && unit > 0) {
    if (hundred > 0 || showZeroHundred) {
      result.push('lẻ');
    }
    result.push(DIGITS[unit]);
  }

  return result.join(' ');
};

/**
 * Chuyển đổi số tiền thành chuỗi chữ Tiếng Việt kèm đơn vị "đồng chẵn"
 * Ví dụ: 31540000 -> "Ba mươi mốt triệu năm trăm bốn mươi nghìn đồng chẵn"
 */
export const numberToVietnameseWords = (amount: number): string => {
  if (isNaN(amount) || amount === 0) {
    return 'Không đồng';
  }

  const isNegative = amount < 0;
  let remaining = Math.abs(Math.round(amount));

  const groups: number[] = [];
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const value = groups[i];
    if (value > 0) {
      const showZeroHundred = i < groups.length - 1;
      const text = readThreeDigits(value, showZeroHundred);
      const scale = SCALES[i];
      parts.push(scale ? `${text} ${scale}` : text);
    }
  }

  let finalString = parts.join(' ').trim();
  if (!finalString) {
    return 'Không đồng';
  }

  // Viết hoa chữ cái đầu tiên
  finalString = finalString.charAt(0).toUpperCase() + finalString.slice(1);

  if (isNegative) {
    finalString = `Âm ${finalString.toLowerCase()}`;
  }

  return `${finalString} đồng chẵn`;
};
