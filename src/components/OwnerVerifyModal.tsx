import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ShieldCheck, Info, Mail } from "lucide-react";

interface OwnerVerifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  verifyEmail?: string;
}

export default function OwnerVerifyModal({ open, onOpenChange, domain, verifyEmail }: OwnerVerifyModalProps) {
  const email = verifyEmail || "kanh05113@gmail.com";
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
              Vui lòng gửi bằng chứng (Giấy phép kinh doanh, Mã số thuế doanh nghiệp, Hóa đơn đăng ký tên miền, hoặc
              văn bản xác nhận từ email tên miền chính thức) về địa chỉ{" "}
              <a href={`mailto:${email}`} className="font-bold text-blue-700 underline">
                {email}
              </a>{" "}
              với tiêu đề <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs font-bold">[Xác minh web] - {domain}</span> để
              đội ngũ xét duyệt thủ công.
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Hệ thống <strong>không yêu cầu CCCD/CMND</strong> hay bất kỳ thông tin nhạy cảm nào của chủ website. Chỉ
              cần tài liệu chứng minh quyền sở hữu tên miền/công ty.
            </p>
          </div>

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
