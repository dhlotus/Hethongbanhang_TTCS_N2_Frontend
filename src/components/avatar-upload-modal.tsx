import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, ZoomIn, ZoomOut, Check, X, ImageIcon, RotateCcw } from 'lucide-react';

// ─── Hằng số ────────────────────────────────────────────────────────────────
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CROP_OUTPUT_SIZE = 256; // px – kích thước ảnh output sau khi crop

interface AvatarUploadModalProps {
  /** URL ảnh hiện tại (nếu có) để hiển thị trong preview mặc định */
  currentAvatarUrl?: string;
  /** Callback khi upload hoàn tất: nhận File đã crop để component cha gọi API */
  onConfirm: (croppedFile: File) => Promise<void>;
  /** Callback khi người dùng đóng modal */
  onClose: () => void;
}

interface CropState {
  x: number; // toạ độ tâm vùng crop trong ảnh gốc (px)
  y: number;
  size: number; // cạnh hình vuông crop (px)
}

/**
 * AvatarUploadModal – SN-145
 *
 * Luồng sử dụng:
 * 1. Người dùng chọn ảnh từ file picker (≤ 2 MB, jpeg/png/webp).
 * 2. Canvas hiển thị ảnh + overlay crop vuông có thể kéo/zoom.
 * 3. Nhấn "Lưu ảnh đại diện" → crop bằng OffscreenCanvas → gọi onConfirm(File).
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
  const [zoom, setZoom] = useState(1); // 1 – 3×
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, cropX: 0, cropY: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl ?? null);

  // ─── Canvas render ────────────────────────────────────────────────────────

  const CANVAS_SIZE = 320; // hiển thị trong modal (CSS px)

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w: natW, h: natH } = imageNaturalSize;
    const scale = (CANVAS_SIZE / Math.max(natW, natH)) * zoom; // px-per-natural-px

    const drawW = natW * scale;
    const drawH = natH * scale;
    const offsetX = (CANVAS_SIZE - drawW) / 2;
    const offsetY = (CANVAS_SIZE - drawH) / 2;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Vẽ ảnh
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    // Vùng tối ngoài crop
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const cropCanvasX = crop.x * scale + offsetX;
    const cropCanvasY = crop.y * scale + offsetY;
    const cropCanvasSize = crop.size * scale;

    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.clearRect(cropCanvasX, cropCanvasY, cropCanvasSize, cropCanvasSize);
    // Vẽ lại ảnh trong vùng crop (loại bỏ overlay tối)
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropCanvasX, cropCanvasY, cropCanvasSize, cropCanvasSize);
    ctx.clip();
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.restore();

    // Viền crop
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropCanvasX, cropCanvasY, cropCanvasSize, cropCanvasSize);

    // Đường lưới 3×3 (rule of thirds)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
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

    // Góc bo tròn handle
    const hs = 8;
    ctx.fillStyle = 'white';
    [
      [cropCanvasX, cropCanvasY],
      [cropCanvasX + cropCanvasSize - hs, cropCanvasY],
      [cropCanvasX, cropCanvasY + cropCanvasSize - hs],
      [cropCanvasX + cropCanvasSize - hs, cropCanvasY + cropCanvasSize - hs],
    ].forEach(([hx, hy]) => {
      ctx.fillRect(hx, hy, hs, hs);
    });
  }, [imageSrc, imageNaturalSize, crop, zoom]);

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
    setZoom(1);
    setImageNaturalSize({ w: natW, h: natH });
    setImageSrc(src);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError('Ảnh vượt quá 2 MB. Vui lòng chọn ảnh nhỏ hơn.');
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

    // Reset input để có thể chọn lại cùng file
    e.target.value = '';
  };

  // ─── Drag to move crop ───────────────────────────────────────────────────

  const getScaleFactor = () => {
    const { w: natW, h: natH } = imageNaturalSize;
    return (CANVAS_SIZE / Math.max(natW, natH)) * zoom;
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cssToCanvas = CANVAS_SIZE / rect.width;
    return {
      x: (e.clientX - rect.left) * cssToCanvas,
      y: (e.clientY - rect.top) * cssToCanvas,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageSrc) return;
    const pos = getCanvasPos(e);
    const scale = getScaleFactor();
    const { w: natW, h: natH } = imageNaturalSize;
    const offsetX = (CANVAS_SIZE - natW * scale) / 2;
    const offsetY = (CANVAS_SIZE - natH * scale) / 2;
    const cropCanvasX = crop.x * scale + offsetX;
    const cropCanvasY = crop.y * scale + offsetY;
    const cropCanvasSize = crop.size * scale;

    if (
      pos.x >= cropCanvasX &&
      pos.x <= cropCanvasX + cropCanvasSize &&
      pos.y >= cropCanvasY &&
      pos.y <= cropCanvasY + cropCanvasSize
    ) {
      setIsDragging(true);
      setDragStart({ mouseX: pos.x, mouseY: pos.y, cropX: crop.x, cropY: crop.y });
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !imageSrc) return;
      const pos = getCanvasPos(e);
      const scale = getScaleFactor();
      const { w: natW, h: natH } = imageNaturalSize;
      const dx = (pos.x - dragStart.mouseX) / scale;
      const dy = (pos.y - dragStart.mouseY) / scale;
      const newX = Math.max(0, Math.min(natW - crop.size, dragStart.cropX + dx));
      const newY = Math.max(0, Math.min(natH - crop.size, dragStart.cropY + dy));
      setCrop((prev) => ({ ...prev, x: newX, y: newY }));
    },
    [isDragging, imageSrc, dragStart, imageNaturalSize, crop.size],
  );

  const handleMouseUp = () => setIsDragging(false);

  // ─── Zoom ────────────────────────────────────────────────────────────────

  const applyZoom = (newZoom: number) => {
    setZoom(newZoom);
    // Khi zoom, điều chỉnh kích thước vùng crop trong toạ độ ảnh gốc
    const { w: natW, h: natH } = imageNaturalSize;
    const minSide = Math.min(natW, natH);
    const newSize = (minSide * 0.8) / newZoom;
    const clampedSize = Math.max(20, Math.min(minSide, newSize));
    const centerX = crop.x + crop.size / 2;
    const centerY = crop.y + crop.size / 2;
    const newX = Math.max(0, Math.min(natW - clampedSize, centerX - clampedSize / 2));
    const newY = Math.max(0, Math.min(natH - clampedSize, centerY - clampedSize / 2));
    setCrop({ x: newX, y: newY, size: clampedSize });
  };

  // ─── Crop → File ─────────────────────────────────────────────────────────

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
        crop.x, crop.y, crop.size, crop.size,
        0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE,
      );

      offCanvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Không thể tạo blob'));
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          resolve(file);
        },
        'image/jpeg',
        0.9,
      );
    });
  };

  const handleConfirm = async () => {
    setError(null);
    setIsUploading(true);
    try {
      const file = await cropToFile();

      // Hiển thị preview tức thì
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      await onConfirm(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setZoom(1);
    setError(null);
    setPreviewUrl(currentAvatarUrl ?? null);
    imageRef.current = null;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 id="avatar-modal-title" className="text-base font-bold text-slate-900">
            Cập nhật ảnh đại diện
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Preview thumbnail hiện tại */}
          {!imageSrc && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Ảnh đại diện hiện tại"
                    className="h-24 w-24 rounded-2xl object-cover ring-4 ring-blue-100 shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100">
                    <ImageIcon className="h-10 w-10 text-blue-300" />
                  </div>
                )}
              </div>

              {/* Drop zone / file picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
              >
                <Upload className="h-6 w-6" />
                <span className="font-medium">Nhấn để chọn ảnh</span>
                <span className="text-xs text-slate-400">JPEG, PNG, WebP — tối đa 2 MB</span>
              </button>
            </div>
          )}

          {/* Canvas editor */}
          {imageSrc && (
            <div className="space-y-3">
              {/* Canvas */}
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="rounded-xl cursor-move touch-none"
                  style={{ width: '100%', maxWidth: `${CANVAS_SIZE}px`, aspectRatio: '1' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
              <p className="text-center text-xs text-slate-400">Kéo để di chuyển vùng cắt</p>

              {/* Zoom controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => applyZoom(Math.max(1, parseFloat((zoom - 0.2).toFixed(1))))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                  aria-label="Thu nhỏ"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => applyZoom(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
                  aria-label="Zoom ảnh"
                />
                <button
                  type="button"
                  onClick={() => applyZoom(Math.min(3, parseFloat((zoom + 0.2).toFixed(1))))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                  aria-label="Phóng to"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>

              {/* Chọn lại */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  Chọn ảnh khác
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Đặt lại
                </button>
              </div>
            </div>
          )}

          {/* Thông báo lỗi */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            id="avatar-upload-confirm-btn"
            onClick={handleConfirm}
            disabled={!imageSrc || isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Đang lưu…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Lưu ảnh đại diện
              </>
            )}
          </button>
        </div>

        {/* Hidden file input */}
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
