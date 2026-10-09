import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, ArrowRight, User, AlertCircle, Loader2 } from 'lucide-react';
import { productsService } from '../services/products.service';
import type { ProductPriceHistory } from '../types/products';

interface ProductPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export const ProductPriceHistoryModal: React.FC<ProductPriceHistoryModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
}) => {
  const [history, setHistory] = useState<ProductPriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      const fetchHistory = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const data = await productsService.getPriceHistory(productId);
          setHistory(data);
        } catch (err) {
          setError('Không thể tải lịch sử thay đổi giá. Vui lòng thử lại sau.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchHistory();
    }
  }, [isOpen, productId]);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-history-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="price-history-title" className="text-lg font-semibold text-slate-800">
                Lịch sử thay đổi giá
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                {productName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-red-500 bg-red-50 rounded-xl">
              <AlertCircle className="w-10 h-10 mb-3" />
              <p className="font-medium text-center">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <Clock className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">Chưa có lịch sử thay đổi giá</p>
              <p className="text-sm mt-1">Sản phẩm này chưa từng được điều chỉnh giá bán.</p>
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {history.map((item) => (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  {/* Timeline marker */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-blue-500">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                  </div>
                  
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-white shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        {formatDate(item.changedAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg mb-3">
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-xs text-slate-500 mb-1">Giá cũ</span>
                        <span className="font-semibold text-slate-600 line-through">
                          {formatCurrency(item.oldPrice)}
                        </span>
                      </div>
                      
                      <div className="text-slate-300 px-2">
                        <ArrowRight className="w-5 h-5 text-blue-400" />
                      </div>
                      
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-xs text-blue-600 font-medium mb-1">Giá mới</span>
                        <span className="font-bold text-blue-700 text-lg">
                          {formatCurrency(item.newPrice)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Thực hiện bởi: <span className="font-medium text-slate-800">{item.changedBy}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render the modal at the root level body
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
};
