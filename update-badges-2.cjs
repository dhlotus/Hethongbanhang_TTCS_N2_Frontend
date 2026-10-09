const fs = require('fs');
const path = require('path');

const pages = [
  'src/pages/customers-page.tsx',
  'src/pages/orders-page.tsx',
  'src/pages/categories-page.tsx',
  'src/pages/price-lists-page.tsx'
];

pages.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  const replacePatterns = [
    {
      regex: /<span\s+className="inline-flex items-center[^>]*bg-emerald-50 text-emerald-700[^>]*>\s*<span\s+className="[^>]*bg-emerald-600[^>]*><\/span>\s*Hoạt động\s*<\/span>/g,
      replacement: '<Badge variant="success" dot>Hoạt động</Badge>'
    },
    {
      regex: /<span\s+className="inline-flex items-center[^>]*bg-blue-50 text-blue-700[^>]*>\s*<span\s+className="[^>]*bg-blue-600[^>]*><\/span>\s*Đang giao dịch\s*<\/span>/g,
      replacement: '<Badge variant="info" dot>Đang giao dịch</Badge>'
    },
    {
      regex: /<span\s+className="inline-flex items-center[^>]*bg-rose-50 text-rose-700[^>]*>\s*<span\s+className="[^>]*bg-rose-600[^>]*><\/span>\s*Tạm khóa\s*<\/span>/g,
      replacement: '<Badge variant="error" dot>Tạm khóa</Badge>'
    },
    {
      regex: /<span\s+className="inline-flex items-center[^>]*bg-rose-50 text-rose-700[^>]*>\s*<span\s+className="[^>]*bg-rose-600[^>]*><\/span>\s*Ngừng hoạt động\s*<\/span>/g,
      replacement: '<Badge variant="error" dot>Ngừng hoạt động</Badge>'
    },
    {
      regex: /<span\s+className="inline-flex items-center[^>]*bg-amber-50 text-amber-700[^>]*>\s*<span\s+className="[^>]*bg-amber-600[^>]*><\/span>\s*Chờ duyệt\s*<\/span>/g,
      replacement: '<Badge variant="warning" dot>Chờ duyệt</Badge>'
    },
    {
      regex: /<span\s+className="inline-flex items-center[^>]*bg-slate-50 text-slate-700[^>]*>\s*<span\s+className="[^>]*bg-slate-600[^>]*><\/span>\s*Bản nháp\s*<\/span>/g,
      replacement: '<Badge variant="secondary" dot>Bản nháp</Badge>'
    },
    {
      regex: /<span\s+className="inline-flex items-center[^>]*bg-emerald-50 text-emerald-700[^>]*>\s*<span\s+className="[^>]*bg-emerald-600[^>]*><\/span>\s*Đã duyệt\s*<\/span>/g,
      replacement: '<Badge variant="success" dot>Đã duyệt</Badge>'
    }
  ];

  replacePatterns.forEach(({ regex, replacement }) => {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      changed = true;
    }
  });

  if (changed) {
    if (content.includes('<Badge') && !content.includes('import { Badge }')) {
      // Find the last import
      const importMatch = content.match(/import .* from '.*';\n/g);
      if (importMatch) {
          const lastImport = importMatch[importMatch.length - 1];
          content = content.replace(lastImport, lastImport + 'import { Badge } from \'../components/badge\';\n');
      }
    }
    fs.writeFileSync(file, content);
    console.log(`Updated badges in ${file}`);
  }
});
