import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { ShieldCheck, Info, Mail, Loader2, CheckCircle2, AlertCircle, ImagePlus, X } from "lucide-react";

interface OwnerVerifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  verifyEmail?: string;
}

const IMG_MAX_BYTES = 1 * 1024 * 1024;
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function OwnerVerifyModal({ open, onOpenChange, domain, verifyEmail }: OwnerVerifyModalProps) {
  const email = verifyEmail || "verify@lachansovn.com";
  const [contactEmail, setContactEmail] = useState("");
  const [note, setNote] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = contactEmail.trim().length > 3 && !submitting;

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    if (!IMG_TYPES.includes(file.type)) {
      setImageError("Chỉ chấp nhận ảnh PNG/JPG/WebP/GIF.");
      return;
    }
    if (file.size > IMG_MAX_BYTES) {
      setImageError("Ảnh tối đa 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(String(reader.result));
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageData("");
    setImageName("");
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v2/owner-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contactEmail.trim(),
          domain,
          note: note.trim(),
          screenshotData: imageData || undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ ok: true, text: data.message || "Đã gửi yêu cầu xác minh thành công." });
        setContactEmail("");
        setNote("");
        clearImage();
      } else {
        setMessage({ ok: false, text: data.message || "Không thể gửi yêu cầu. Vui lòng thử lại." });
      }
    } catch {
      setMessage({ ok: false, text: "Lỗi mạng. Vui lòng thử lại sau." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight text-gray-950">
              Yêu cầu xác minh website chính chủ
            </DialogTitle>
          </div>
          <DialogDescription className="pt-1 text-sm leading-6 text-gray-600">
            Website <strong className="text-gray-900">{domain}</strong> đang ở trạng thái{" "}
            <span className="font-bold text-yellow-700">CẦN XÁC MINH THÊM</span> — chưa đủ bằng chứng để xác nhận an
            toàn tuyệt đối.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-relaxed text-gray-800">
            <p className="font-bold text-blue-800">Cách xác minh chủ website</p>
            <p className="mt-2">
              Bạn có thể gửi yêu cầu ngay tại đây, hoặc gửi bằng chứng (Giấy phép kinh doanh, Mã số thuế doanh nghiệp,
              Hóa đơn đăng ký tên miền, hoặc văn bản xác nhận từ email tên miền chính thức) về{" "}
              <a href={`mailto:${email}`} className="font-bold text-blue-700 underline">
                {email}
              </a>{" "}
              với tiêu đề <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs font-bold">[Xác minh web] - {domain}</span>.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner-email">Email liên hệ của bạn *</Label>
            <Input id="owner-email" type="email" placeholder="you@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner-note">Mô tả quyền sở hữu (tùy chọn)</Label>
            <Textarea
              id="owner-note"
              rows={3}
              placeholder="Ví dụ: tôi là chủ doanh nghiệp ..., MST ..., đăng ký tên miền này từ năm ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ảnh giấy tờ (tùy chọn, tối đa 1MB)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onPickImage}
              className="hidden"
            />
            {imageData ? (
              <div className="relative overflow-hidden rounded-xl border border-gray-200">
                <img src={imageData} alt="Giấy tờ" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Xóa ảnh"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100"
              >
                <ImagePlus className="h-5 w-5" />
                Chọn file ảnh (GPKD, MST, hóa đơn domain,...)
              </button>
            )}
            {imageName && !imageError && <p className="text-xs text-gray-500">Đã chọn: {imageName}</p>}
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Hệ thống <strong>không yêu cầu CCCD/CMND</strong> hay bất kỳ thông tin nhạy cảm nào của chủ website. Chỉ
              cần tài liệu chứng minh quyền sở hữu tên miền/công ty.
            </p>
          </div>

          {message && (
            <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
              {message.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Gửi yêu cầu xác minh
          </button>

          <div className="flex items-start gap-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p>
              Sau khi nhận được bằng chứng, đội ngũ xét duyệt trong <strong>24–48 giờ</strong> và cập nhật trạng thái
              website trong kết quả tra cứu.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}