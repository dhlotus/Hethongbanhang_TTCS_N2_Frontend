import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Loader2, Edit2, X } from 'lucide-react';
import { Input } from './input';
import type { UpdateMyProfilePayload } from '../services/users.service';

interface ProfileEditModalProps {
  fullName: string;
  phone: string;
  onClose: () => void;
  onSave: (payload: UpdateMyProfilePayload) => Promise<void>;
}

const VIETNAM_PHONE_PATTERN = /^(?:0|\+84)(?:[35789]\d{8}|2\d{9})$/;

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  fullName,
  phone,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(fullName);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedPhone = phoneNumber.trim();
    const nextNameError = normalizedName
      ? normalizedName.length > 100
        ? 'Họ và tên không được vượt quá 100 ký tự.'
        : ''
      : 'Vui lòng nhập họ và tên.';
    const nextPhoneError = VIETNAM_PHONE_PATTERN.test(normalizedPhone)
      ? ''
      : 'Nhập số điện thoại Việt Nam hợp lệ, ví dụ 0912345678 hoặc +84912345678.';

    setNameError(nextNameError);
    setPhoneError(nextPhoneError);
    setSubmitError('');
    if (nextNameError || nextPhoneError) return;

    setIsSaving(true);
    try {
      await onSave({ fullName: normalizedName, phone: normalizedPhone });
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-modal-backdrop-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        className="w-full max-w-md rounded-xl border border-slate-100 bg-white p-6 shadow-lg animate-modal-in sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Edit2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="profile-edit-title" className="text-lg font-bold text-slate-900">
                Chỉnh sửa cá nhân
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Cập nhật họ tên và số điện thoại liên hệ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Đóng"
            className="w-9 h-9 flex items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Input
            label="Họ và tên"
            name="fullName"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError('');
              setSubmitError('');
            }}
            error={nameError}
            required
            maxLength={100}
            autoComplete="name"
            autoFocus
            disabled={isSaving}
          />
          <Input
            label="Số điện thoại"
            name="phone"
            type="tel"
            inputMode="tel"
            value={phoneNumber}
            onChange={(event) => {
              setPhoneNumber(event.target.value);
              setPhoneError('');
              setSubmitError('');
            }}
            error={phoneError}
            required
            autoComplete="tel"
            placeholder="0912345678"
            disabled={isSaving}
          />

          {submitError && (
            <p role="alert" className="flex items-start gap-2 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
};
