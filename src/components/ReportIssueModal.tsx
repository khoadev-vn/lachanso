import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Loader2, Flag, AlertCircle, CheckCircle2, ImagePlus, X } from "lucide-react";

interface ReportIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUrl: string;
}

const IMG_MAX_BYTES = 1 * 1024 * 1024;
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function ReportIssueModal({ open, onOpenChange, targetUrl }: ReportIssueModalProps) {
  const [email, setEmail] = useState("");
  const [reportType, setReportType] = useState<"false_positive" | "false_negative">("false_positive");
  const [evidence, setEvidence] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = email.trim().length > 3 && evidence.trim().length >= 10 && agreeTerms && !submitting;

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
      const response = await fetch("/api/v2/report-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          targetUrl,
          reportType,
          evidence: evidence.trim(),
          agreeTerms: true,
          screenshotData: imageData || undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ ok: true, text: data.message || "Đã gửi khiếu nại thành công." });
        setEmail("");
        setEvidence("");
        setAgreeTerms(false);
        clearImage();
      } else {
        setMessage({ ok: false, text: data.message || "Không thể gửi khiếu nại. Vui lòng thử lại." });
      }
    } catch {
      setMessage({ ok: false, text: "Lỗi mạng. Vui lòng thử lại sau." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Flag className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-gray-950">Báo kết quả sai</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Giúp Lá Chắn Số cải thiện độ chính xác — đội ngũ sẽ xem xét trong 24–48h.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-email">Email liên hệ của bạn *</Label>
            <Input id="report-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-url">Website bị đánh giá</Label>
            <Input id="report-url" value={targetUrl} readOnly className="bg-gray-50 font-mono text-xs" />
          </div>

          <div className="space-y-2">
            <Label>Loại khiếu nại *</Label>
            <div className="grid grid-cols-1 gap-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${reportType === "false_positive" ? "border-orange-300 bg-orange-50/60" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
                <input
                  type="radio"
                  name="reportType"
                  checked={reportType === "false_positive"}
                  onChange={() => setReportType("false_positive")}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <span className="text-sm">
                  <span className="font-bold text-gray-900">Web an toàn nhưng bị báo vi phạm</span>
                  <span className="block text-xs text-gray-500">Website của tôi/cơ quan hợp pháp nhưng bị đánh giá là nguy hiểm hoặc đáng ngờ.</span>
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${reportType === "false_negative" ? "border-red-300 bg-red-50/60" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
                <input
                  type="radio"
                  name="reportType"
                  checked={reportType === "false_negative"}
                  onChange={() => setReportType("false_negative")}
                  className="mt-1 h-4 w-4 accent-red-500"
                />
                <span className="text-sm">
                  <span className="font-bold text-gray-900">Web lừa đảo/độc hại nhưng bị bỏ sót</span>
                  <span className="block text-xs text-gray-500">Tôi phát hiện website lừa đảo nhưng hệ thống không cảnh báo.</span>
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-evidence">Bằng chứng / mô tả chi tiết *</Label>
            <Textarea
              id="report-evidence"
              rows={4}
              placeholder="Ví dụ: tên miền chính thức là ..., giấy phép đăng ký ..., hoặc website này yêu cầu nhập mật khẩu/OTP và gửi tin nhắn lừa đảo."
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ảnh bằng chứng (tùy chọn, tối đa 1MB)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onPickImage}
              className="hidden"
            />
            {imageData ? (
              <div className="relative overflow-hidden rounded-xl border border-gray-200">
                <img src={imageData} alt="Bằng chứng" className="h-40 w-full object-cover" />
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
                Chọn file ảnh (GPKD, Mã số thuế, ảnh chụp trang lừa đảo,...)
              </button>
            )}
            {imageName && !imageError && (
              <p className="text-xs text-gray-500">Đã chọn: {imageName}</p>
            )}
            {imageError && (
              <p className="text-xs text-red-600">{imageError}</p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 p-3">
            <Checkbox checked={agreeTerms} onCheckedChange={(v: boolean) => setAgreeTerms(Boolean(v))} />
            <span className="text-xs leading-5 text-gray-600">
              Tôi xác nhận thông tin trên là chính xác và không gửi báo cáo trùng lặp hoặc sai sự thật.
            </span>
          </label>

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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            Gửi khiếu nại
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
