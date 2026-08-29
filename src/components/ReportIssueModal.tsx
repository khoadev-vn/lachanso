import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Loader2, Flag, AlertCircle, CheckCircle2, ImagePlus, X, Globe, FileText } from "lucide-react";
import { useLang } from "../contexts/LangContext";

interface ReportIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUrl: string;
  kind?: "web" | "news";
  defaultType?: "false_positive" | "false_negative";
}

const IMG_MAX_BYTES = 1 * 1024 * 1024;
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function ReportIssueModal({ open, onOpenChange, targetUrl, kind = "web", defaultType = "false_positive" }: ReportIssueModalProps) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [reportType, setReportType] = useState<"false_positive" | "false_negative">(defaultType);
  const [evidence, setEvidence] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && evidence.trim().length >= 10 && agreeTerms && !submitting;

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
          kind,
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

  const isNews = kind === "news";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Flag className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-gray-950">{t('report.title')}</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {t('report.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-email">{t('report.email')} *</Label>
            <Input id="report-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {email.trim().length > 0 && !emailValid && (
              <p className="text-xs text-red-600">{t('report.emailInvalid')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-url">{isNews ? t('report.newsContent') : t('report.website')}</Label>
            <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {isNews ? <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /> : <Globe className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />}
              <p className="line-clamp-3 break-all text-xs font-medium text-gray-600">{targetUrl || "—"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('report.claimType')} *</Label>
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
                  <span className="font-bold text-gray-900">{isNews ? t('report.falsePositiveNews') : t('report.falsePositiveWeb')}</span>
                  <span className="block text-xs text-gray-500">{isNews ? t('report.falsePositiveNewsDesc') : t('report.falsePositiveWebDesc')}</span>
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
                  <span className="font-bold text-gray-900">{isNews ? t('report.falseNegativeNews') : t('report.falseNegativeWeb')}</span>
                  <span className="block text-xs text-gray-500">{isNews ? t('report.falseNegativeNewsDesc') : t('report.falseNegativeWebDesc')}</span>
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-evidence">{t('report.evidence')} *</Label>
            <Textarea
              id="report-evidence"
              rows={4}
              placeholder={isNews ? t('report.evidencePlaceholderNews') : t('report.evidencePlaceholderWeb')}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{t('report.minChars')}{evidence.trim().length >= 10 ? "" : ` (${t('report.remaining')} ${10 - evidence.trim().length})`}</p>
              <span className={`text-xs font-bold ${evidence.trim().length >= 10 ? "text-emerald-600" : "text-gray-400"}`}>{evidence.trim().length}/10</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('report.imageProof')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onPickImage}
              className="hidden"
            />
            {imageData ? (
              <div className="relative overflow-hidden rounded-xl border border-gray-200">
                <img src={imageData} alt={t('report.proof')} className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label={t('report.deleteImage')}
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
                {isNews ? t('report.chooseImageNews') : t('report.chooseImageWeb')}
              </button>
            )}
            {imageName && !imageError && (
              <p className="text-xs text-gray-500">{t('report.selected')}: {imageName}</p>
            )}
            {imageError && (
              <p className="text-xs text-red-600">{imageError}</p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 p-3">
            <Checkbox checked={agreeTerms} onCheckedChange={(v: boolean) => setAgreeTerms(Boolean(v))} />
            <span className="text-xs leading-5 text-gray-600">
              {t('report.confirmInfo')}
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
            {t('report.submit')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
