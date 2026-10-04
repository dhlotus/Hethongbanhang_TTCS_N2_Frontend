import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Check, ImageIcon, RotateCcw, AlertCircle } from 'lucide-react';
import { resolveAvatarUrl } from '../utils/avatar';

// ─── Hằng số ────────────────────────────────────────────────────────────────
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CROP_OUTPUT_SIZE = 256; // px – kích thước ảnh output sau khi crop
const CANVAS_SIZE = 340; // px – kích thước khung canvas hiển thị
const CORNER_HANDLE_RADIUS = 22; // px – bán kính vùng bấm/chạm góc

interface AvatarUploadModalProps {
  /** URL ảnh hiện tại (nếu có) để hiển thị trong preview mặc định */
  currentAvatarUrl?: string;
  /** Callback khi upload hoàn tất: nhận File đã crop để component cha gọi API */
  onConfirm: (croppedFile: File) => Promise<void>;
  /** Callback khi người dùng đóng modal */
  onClose: () => void;
}

interface CropState {
  x: number; // toạ độ góc trên-trái vùng crop trong ảnh gốc (px)
  y: number;
  size: number; // cạnh hình vuông crop (px)
}

type DragMode = 'none' | 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  cropX: number;
  cropY: number;
  cropSize: number;
}

/**
 * AvatarUploadModal – SN-145
 *
 * Tính năng chính:
 * 1. Bỏ thanh trượt zoom, thay bằng thao tác kéo trực quan tại 4 góc khung chọn.
 * 2. Di chuyển tự do vị trí khung crop bằng cách kéo vùng bên trong.
 * 3. Hỗ trợ con lăn chuột (scroll wheel) và cảm ứng (touch) để phóng to/thu nhỏ nhanh.
 * 4. Bỏ nút 'X' thừa trên header vì đã có nút 'Huỷ' rõ ràng ở chân modal.
 * 5. Lớp overlay nền dịu nhẹ (30% opacity, blur nhẹ) không làm tối sầm màn hình.
 */
export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  currentAvatarUrl,
  onConfirm,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, size: 0 });
  const [dragState, setDragState] = useState<DragState>({
    mode: 'none',
    startX: 0,
    startY: 0,
    cropX: 0,
    cropY: 0,
    cropSize: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl ?? null);

  // Hệ số tỉ lệ quy đổi toạ độ ảnh gốc sang canvas
  const getScaleFactor = useCallback(() => {
    const { w: natW, h: natH } = imageNaturalSize;
    if (natW === 0 || natH === 0) return 1;
    return CANVAS_SIZE / Math.max(natW, natH);
  }, [imageNaturalSize]);

  // ─── Canvas render ────────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w: natW, h: natH } = imageNaturalSize;
    const scale = getScaleFactor();

    const drawW = natW * scale;
    const drawH = natH * scale;
    const offsetX = (CANVAS_SIZE - drawW) / 2;
    const offsetY = (CANVAS_SIZE - drawH) / 2;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 1. Vẽ ảnh gốc toàn phần
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    // 2. Vùng tối mờ bên ngoài khung crop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    const cropCanvasX = crop.x * scale + offsetX;
    const cropCanvasY = crop.y * scale + offsetY;
    const cropCanvasSize = crop.size * scale;

    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.clearRect(cropCanvasX, cropCanvasY, cropCanvasSize, cropCanvasSize);

    // 3. Vẽ lại ảnh trong vùng crop để hiển thị sáng rõ nét
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropCanvasX, cropCanvasY, cropCanvasSize, cropCanvasSize);
    ctx.clip();
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.restore();

    // 4. Viền khung crop trắng tinh tế
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropCanvasX, cropCanvasY, cropCanvasSize, cropCanvasSize);

    // 5. Đường lưới 3×3 (Rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const d = (cropCanvasSize / 3) * i;
      ctx.beginPath();
      ctx.moveTo(cropCanvasX + d, cropCanvasY);
      ctx.lineTo(cropCanvasX + d, cropCanvasY + cropCanvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cropCanvasX, cropCanvasY + d);
      ctx.lineTo(cropCanvasX + cropCanvasSize, cropCanvasY + d);
      ctx.stroke();
    }

    // 6. 4 góc bo điều chỉnh kích thước (Interactive Corner Handles)
    const corners = [
      { x: cropCanvasX, y: cropCanvasY },
      { x: cropCanvasX + cropCanvasSize, y: cropCanvasY },
      { x: cropCanvasX, y: cropCanvasY + cropCanvasSize },
      { x: cropCanvasX + cropCanvasSize, y: cropCanvasY + cropCanvasSize },
    ];

    corners.forEach(({ x, y }) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      // Vòng tròn trắng
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Viền xanh cobalt nổi bật
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.restore();
    });
  }, [imageSrc, imageNaturalSize, crop, getScaleFactor]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ─── Load ảnh ────────────────────────────────────────────────────────────
  const loadImage = useCallback((src: string, natW: number, natH: number) => {
    const minSide = Math.min(natW, natH);
    const initSize = minSide * 0.8;
    setCrop({
      x: (natW - initSize) / 2,
      y: (natH - initSize) / 2,
      size: initSize,
    });
    setImageNaturalSize({ w: natW, h: natH });
    setImageSrc(src);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Chỉ chấp nhận định dạng ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError('Kích thước ảnh vượt quá 2 MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        loadImage(src, img.naturalWidth, img.naturalHeight);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  // ─── Tính toán toạ độ chuột/touch trên Canvas ───────────────────────────
  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const ratio = CANVAS_SIZE / rect.width;
    return {
      x: (clientX - rect.left) * ratio,
      y: (clientY - rect.top) * ratio,
    };
  };

  // Xác định chế độ thao tác: Kéo góc (resize) hay kéo giữa (move)
  const detectInteraction = useCallback(
    (posX: number, posY: number): DragMode => {
      const scale = getScaleFactor();
      const { w: natW, h: natH } = imageNaturalSize;
      const offsetX = (CANVAS_SIZE - natW * scale) / 2;
      const offsetY = (CANVAS_SIZE - natH * scale) / 2;
      const cropX = crop.x * scale + offsetX;
      const cropY = crop.y * scale + offsetY;
      const cropSize = crop.size * scale;

      // 1. Kiểm tra 4 góc (Resize handles)
      const distTL = Math.hypot(posX - cropX, posY - cropY);
      if (distTL <= CORNER_HANDLE_RADIUS) return 'nw';

      const distTR = Math.hypot(posX - (cropX + cropSize), posY - cropY);
      if (distTR <= CORNER_HANDLE_RADIUS) return 'ne';

      const distBL = Math.hypot(posX - cropX, posY - (cropY + cropSize));
      if (distBL <= CORNER_HANDLE_RADIUS) return 'sw';

      const distBR = Math.hypot(posX - (cropX + cropSize), posY - (cropY + cropSize));
      if (distBR <= CORNER_HANDLE_RADIUS) return 'se';

      // 2. Kiểm tra bên trong vùng crop (Move)
      if (
        posX >= cropX &&
        posX <= cropX + cropSize &&
        posY >= cropY &&
        posY <= cropY + cropSize
      ) {
        return 'move';
      }

      return 'none';
    },
    [crop, getScaleFactor, imageNaturalSize]
  );

  // ─── Xử lý Bắt đầu Kéo (Pointer Down) ──────────────────────────────────
  const startDrag = (clientX: number, clientY: number) => {
    if (!imageSrc) return;
    const pos = getCanvasCoordinates(clientX, clientY);
    const mode = detectInteraction(pos.x, pos.y);

    if (mode !== 'none') {
      setDragState({
        mode,
        startX: pos.x,
        startY: pos.y,
        cropX: crop.x,
        cropY: crop.y,
        cropSize: crop.size,
      });
    }
  };

  // ─── Xử lý Di chuyển Kéo (Pointer Move) ─────────────────────────────────
  const processDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageSrc) return;
      const pos = getCanvasCoordinates(clientX, clientY);
      const canvas = canvasRef.current;

      // Cập nhật con trỏ chuột khi di chuyển tự do (không kéo)
      if (dragState.mode === 'none') {
        const hoverMode = detectInteraction(pos.x, pos.y);
        if (canvas) {
          if (hoverMode === 'nw' || hoverMode === 'se') {
            canvas.style.cursor = 'nwse-resize';
          } else if (hoverMode === 'ne' || hoverMode === 'sw') {
            canvas.style.cursor = 'nesw-resize';
          } else if (hoverMode === 'move') {
            canvas.style.cursor = 'grab';
          } else {
            canvas.style.cursor = 'default';
          }
        }
        return;
      }

      // Đang trong tiến trình kéo:
      const scale = getScaleFactor();
      const { w: natW, h: natH } = imageNaturalSize;
      const dx = (pos.x - dragState.startX) / scale;
      const dy = (pos.y - dragState.startY) / scale;
      const minSide = Math.min(natW, natH);
      const minCrop = Math.max(30, minSide * 0.15); // Kích thước tối thiểu không bị mất kiểm soát

      if (dragState.mode === 'move') {
        // Di chuyển vùng crop bên trong ảnh
        const newX = Math.max(0, Math.min(natW - dragState.cropSize, dragState.cropX + dx));
        const newY = Math.max(0, Math.min(natH - dragState.cropSize, dragState.cropY + dy));
        setCrop((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (dragState.mode === 'se') {
        // Kéo góc Dưới - Phải (Resize)
        const maxAllowed = Math.min(natW - dragState.cropX, natH - dragState.cropY);
        const delta = Math.max(dx, dy);
        const newSize = Math.max(minCrop, Math.min(maxAllowed, dragState.cropSize + delta));
        setCrop({ x: dragState.cropX, y: dragState.cropY, size: newSize });
      } else if (dragState.mode === 'nw') {
        // Kéo góc Trên - Trái (Resize)
        const fixedBRX = dragState.cropX + dragState.cropSize;
        const fixedBRY = dragState.cropY + dragState.cropSize;
        const maxAllowed = Math.min(fixedBRX, fixedBRY);
        const delta = -Math.min(dx, dy);
        const newSize = Math.max(minCrop, Math.min(maxAllowed, dragState.cropSize + delta));
        setCrop({
          x: fixedBRX - newSize,
          y: fixedBRY - newSize,
          size: newSize,
        });
      } else if (dragState.mode === 'ne') {
        // Kéo góc Trên - Phải (Resize)
        const fixedBLX = dragState.cropX;
        const fixedBLY = dragState.cropY + dragState.cropSize;
        const maxAllowed = Math.min(natW - fixedBLX, fixedBLY);
        const delta = (dx - dy) / 2;
        const newSize = Math.max(minCrop, Math.min(maxAllowed, dragState.cropSize + delta));
        setCrop({
          x: fixedBLX,
          y: fixedBLY - newSize,
          size: newSize,
        });
      } else if (dragState.mode === 'sw') {
        // Kéo góc Dưới - Trái (Resize)
        const fixedTRX = dragState.cropX + dragState.cropSize;
        const fixedTRY = dragState.cropY;
        const maxAllowed = Math.min(fixedTRX, natH - fixedTRY);
        const delta = (-dx + dy) / 2;
        const newSize = Math.max(minCrop, Math.min(maxAllowed, dragState.cropSize + delta));
        setCrop({
          x: fixedTRX - newSize,
          y: fixedTRY,
          size: newSize,
        });
      }
    },
    [
      imageSrc,
      dragState,
      detectInteraction,
      getScaleFactor,
      imageNaturalSize,
    ]
  );

  const endDrag = () => {
    setDragState((prev) => ({ ...prev, mode: 'none' }));
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  // ─── Con lăn chuột để Zoom nhanh (Wheel Zoom) ──────────────────────────
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!imageSrc) return;
    const delta = e.deltaY < 0 ? -16 : 16;
    const { w: natW, h: natH } = imageNaturalSize;
    const minSide = Math.min(natW, natH);
    const minCrop = Math.max(30, minSide * 0.15);
    const newSize = Math.max(minCrop, Math.min(minSide, crop.size + delta));

    // Giữ nguyên tâm khung cắt khi thu phóng
    const centerX = crop.x + crop.size / 2;
    const centerY = crop.y + crop.size / 2;
    const newX = Math.max(0, Math.min(natW - newSize, centerX - newSize / 2));
    const newY = Math.max(0, Math.min(natH - newSize, centerY - newSize / 2));

    setCrop({ x: newX, y: newY, size: newSize });
  };

  // ─── Crop ảnh xuất ra File ──────────────────────────────────────────────
  const cropToFile = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = imageRef.current;
      if (!img) return reject(new Error('Chưa có ảnh'));

      const offCanvas = document.createElement('canvas');
      offCanvas.width = CROP_OUTPUT_SIZE;
      offCanvas.height = CROP_OUTPUT_SIZE;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context lỗi'));

      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.size,
        crop.size,
        0,
        0,
        CROP_OUTPUT_SIZE,
        CROP_OUTPUT_SIZE
      );

      offCanvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Không thể tạo file ảnh'));
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          resolve(file);
        },
        'image/jpeg',
        0.92
      );
    });
  };

  const handleConfirm = async () => {
    setError(null);
    setIsUploading(true);
    try {
      const file = await cropToFile();

      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      await onConfirm(file);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Upload thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    if (imageRef.current) {
      const { w: natW, h: natH } = imageNaturalSize;
      const minSide = Math.min(natW, natH);
      const initSize = minSide * 0.8;
      setCrop({
        x: (natW - initSize) / 2,
        y: (natH - initSize) / 2,
        size: initSize,
      });
    } else {
      setImageSrc(null);
      setError(null);
      setPreviewUrl(currentAvatarUrl ?? null);
      imageRef.current = null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-[2px] p-4 transition-all duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header: Tinh gọn, đã bỏ nút 'X' thừa vì đã có nút 'Huỷ' ở dưới */}
        <div className="px-6 py-4.5 border-b border-slate-100">
          <h2 id="avatar-modal-title" className="text-base font-bold text-slate-900 tracking-tight">
            Cập nhật ảnh đại diện
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Căn chỉnh vùng hiển thị ảnh đại diện của bạn
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Trạng thái 1: Chưa chọn ảnh mới -> Hiển thị avatar hiện tại & Box upload */}
          {!imageSrc && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={resolveAvatarUrl(previewUrl)}
                    alt="Ảnh đại diện hiện tại"
                    className="h-28 w-28 rounded-2xl object-cover ring-4 ring-blue-50 shadow-md"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-100 ring-4 ring-blue-50/60">
                    <ImageIcon className="h-12 w-12 text-blue-400" />
                  </div>
                )}
              </div>

              {/* Khu vực chọn ảnh */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/90 bg-slate-50/60 px-4 py-7 text-center text-slate-600 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 cursor-pointer group"
              >
                <div className="p-3 rounded-xl bg-white shadow-2xs group-hover:bg-blue-100/60 transition-colors">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <span className="font-semibold text-sm text-slate-800 group-hover:text-blue-600">
                  Nhấn để chọn ảnh mới từ thiết bị
                </span>
                <span className="text-xs text-slate-400">
                  Hỗ trợ JPEG, PNG, WebP — Tối đa 2 MB
                </span>
              </button>
            </div>
          )}

          {/* Trạng thái 2: Đã nạp ảnh -> Canvas crop với 4 góc kéo to nhỏ mượt mà */}
          {imageSrc && (
            <div className="space-y-3.5">
              {/* Vùng Canvas hiển thị ảnh */}
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="rounded-2xl shadow-inner border border-slate-200/80 bg-slate-950 touch-none select-none"
                  style={{ width: '100%', maxWidth: `${CANVAS_SIZE}px`, aspectRatio: '1' }}
                  onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
                  onMouseMove={(e) => processDrag(e.clientX, e.clientY)}
                  onMouseUp={endDrag}
                  onMouseLeave={endDrag}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    if (t) startDrag(t.clientX, t.clientY);
                  }}
                  onTouchMove={(e) => {
                    const t = e.touches[0];
                    if (t) processDrag(t.clientX, t.clientY);
                  }}
                  onTouchEnd={endDrag}
                  onWheel={handleWheel}
                />
              </div>

              {/* Hướng dẫn thao tác trực quan */}
              <div className="flex items-center justify-center py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[11px] text-slate-500 font-medium select-none">
                  Kéo <strong className="text-blue-600">4 góc tròn</strong> để thu phóng • Kéo <strong className="text-slate-700">ở giữa</strong> để căn góc ảnh
                </p>
              </div>

              {/* Hàng nút tác vụ phụ (Chọn ảnh khác / Đặt lại vị trí) */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600 transition-all cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Chọn ảnh khác</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>
          )}

          {/* Thông báo lỗi khi tải ảnh */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200/80 px-4 py-3 text-xs sm:text-sm text-rose-700 font-medium"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer: Nút Huỷ và Lưu ảnh đại diện */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            id="avatar-upload-confirm-btn"
            onClick={handleConfirm}
            disabled={!imageSrc || isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Đang lưu…</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Lưu ảnh đại diện</span>
              </>
            )}
          </button>
        </div>

        {/* File input ẩn */}
        <input
          ref={fileInputRef}
          id="avatar-file-input"
          type="file"
          accept={ALLOWED_MIME_TYPES.join(',')}
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Chọn file ảnh đại diện"
        />
      </div>
    </div>
  );
};
