function App() {
  return (
    <main className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-8">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 font-bold text-xl shadow-sm">
          OMS
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          Hệ Thống Bán Hàng & Kho
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Dự án đã được làm sạch và chuẩn bị sẵn sàng cấu trúc thư mục để bắt đầu phát triển.
        </p>
        <div className="text-xs text-slate-400 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 text-left space-y-1">
          <div>📁 src/components</div>
          <div>📁 src/pages</div>
          <div>📁 src/layouts</div>
          <div>📁 src/services</div>
          <div>📁 src/routes</div>
          <div>📁 src/utils</div>
        </div>
      </div>
    </main>
  );
}

export default App;