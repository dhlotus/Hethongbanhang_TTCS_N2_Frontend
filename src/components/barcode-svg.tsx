import React from 'react';

/**
 * Bảng mã Code 39 (hỗ trợ chữ in hoa, số và dấu gạch ngang)
 * Chuẩn quốc tế dùng cho máy quét mã vạch kho hàng (Barcode Scanner)
 */
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  $: '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100', // Ký tự bắt đầu và kết thúc
};

interface BarcodeSvgProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

/**
 * Component tạo Mã vạch Vector SVG chuẩn công nghiệp
 * Cho phép in sắc nét không bị nhòe và máy quét kho tra cứu tức thời (SN-47)
 */
export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  height = 56,
  showText = true,
  className = '',
}) => {
  const normalizedValue = (value || '').toUpperCase().trim();
  // Mã Code 39 yêu cầu ký tự bắt đầu và kết thúc là dấu sao '*'
  const fullText = `*${normalizedValue}*`;

  // Tính toán các thanh vạch đen và khoảng trắng
  const narrowWidth = 2;
  const wideWidth = 5;
  const gapWidth = 2;

  const bars: { x: number; width: number }[] = [];
  let currentX = 10; // Khoảng đệm lề trái (quiet zone)

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let bitIdx = 0; bitIdx < 9; bitIdx++) {
      const isBar = bitIdx % 2 === 0;
      const isWide = pattern[bitIdx] === '1';
      const width = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        bars.push({ x: currentX, width });
      }
      currentX += width;
    }
    // Khoảng cách giữa các ký tự
    currentX += gapWidth;
  }

  const totalWidth = currentX + 10; // Khoảng đệm lề phải

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto max-h-[58px]"
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="crispEdges"
      >
        <rect width={totalWidth} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={2}
            width={bar.width}
            height={height - 4}
            fill="#111827"
          />
        ))}
      </svg>
      {showText && (
        <span className="text-[11px] font-mono tracking-widest text-slate-800 font-bold mt-1">
          {normalizedValue}
        </span>
      )}
    </div>
  );
};
