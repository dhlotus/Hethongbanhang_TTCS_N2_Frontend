const fs = require('fs');

const pages = [
  'src/pages/users-page.tsx',
  'src/pages/products-page.tsx',
  'src/pages/customers-page.tsx',
  'src/pages/orders-page.tsx'
];

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  // Replace manual Hoạt động / Bị khóa badges in users-page.tsx
  content = content.replace(/<span className="inline-flex items-center gap-1\.5 rounded-full bg-emerald-50 px-2\.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600\/20 whitespace-nowrap">\s*<span className="h-1\.5 w-1\.5 rounded-full bg-emerald-500 shrink-0" \/>\s*<span>Hoạt động<\/span>\s*<\/span>/g, '<Badge variant="success" dot>Hoạt động</Badge>');

  content = content.replace(/<span\s*className="inline-flex items-center gap-1\.5 rounded-full bg-rose-50 px-2\.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600\/20 cursor-help whitespace-nowrap"\s*title=\{u\.lockReason \|\| 'Tài khoản bị khóa bởi Quản trị viên'\}\s*>\s*<span className="h-1\.5 w-1\.5 rounded-full bg-rose-500 shrink-0" \/>\s*<span>Bị khóa<\/span>\s*<\/span>/g, '<Badge variant="error" dot title={u.lockReason || \'Tài khoản bị khóa bởi Quản trị viên\'} className="cursor-help">Bị khóa</Badge>');

  // Ensure Badge is imported if used
  if (content.includes('<Badge') && !content.includes('import { Badge } from')) {
    content = content.replace(/(import .* from ['"]lucide-react['"];)/, '$1\nimport { Badge } from \'../components/badge\';');
  }

  fs.writeFileSync(file, content);
});

console.log('Badge replacements done for users-page');
