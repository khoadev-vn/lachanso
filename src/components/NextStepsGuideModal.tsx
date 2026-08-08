import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ShieldAlert, ShieldBan, Lock, Share2, Search, Phone } from "lucide-react";

interface NextStepsGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "web" | "news";
  dangerLevel: "danger" | "warning" | "safe";
}

const ACTION_CALLOUTS = [
  {
    icon: ShieldBan,
    title: "Tuyệt đối KHÔNG",
    items: [
      "Không nhấp vào link, tải file hay quét mã QR trong nội dung/link này.",
      "Không nhập tên đăng nhập, mật khẩu, OTP, số thẻ hoặc CMND/CCCD trên trang.",
      "Không chuyển khoản, nạp thẻ hoặc 'thanh toán phí' theo bất kỳ hướng dẫn nào.",
      "Không chia sẻ tiếp link này cho người thân, bạn bè, hội nhóm."
    ],
    color: "border-red-200 bg-red-50/70",
    iconColor: "text-red-600",
  },
  {
    icon: Search,
    title: "Xác minh lại bằng nguồn chính thống",
    items: [
      "Tìm lại thông tin trên báo chí uy tín (VnExpress, Tuổi Trẻ, Thanh Niên, VietnamNet...) hoặc kênh tin cơ quan chức năng.",
      "Truy cập TRỰC TIẾP website chính thức (nhập tay địa chỉ, đừng bấm link nghi ngờ).",
      "Đối chiếu số điện thoại hotline, email, zalo chính thức của thương hiệu/cơ quan."
    ],
    color: "border-blue-200 bg-blue-50/80",
    iconColor: "text-blue-600",
  },
  {
    icon: Phone,
    title: "Báo cáo ngay cho cơ quan chức năng",
    items: [
      "Cục An toàn Thông tin – Bộ TTTT: hotline 113 (bộ phận an ninh mạng) hoặc qua cổng online.",
      "Trung tâm Giám sát An toàn không gian mạng quốc gia: 113 / bkcert.vn — báo phishing, lừa đảo.",
      "Phản ánh trên trang 'Bộ Công an khvung chống tội phạm mạng' hoặc đến công an phường/xã gần nhất nếu bạn bị chuyển tiền.",
      "Nếu là tin giả trên Facebook/Zalo: dùng tính năng 'Báo cáo' bài đăng, xem và lan tỏa cảnh báo."
    ],
    color: "border-emerald-200 bg-emerald-50/80",
    iconColor: "text-emerald-600",
  },
  {
    icon: Lock,
    title: "Bảo vệ tài khoản nếu bạn đã tương tác",
    items: [
      "Hong đổi ngay mật khẩu của các tài khoản liên quan, bật xác thực hai lớp (2FA).",
      "Kiểm tra lịch sử giao dịch/một mã OTP bị gửi đi.",
      "Nếu chuyển nhầm khoản tiền: gọi hotline ngân hàng và trình báo Công an ngay trong ngày."
    ],
    color: "border-violet-200 bg-violet-50/80",
    iconColor: "text-violet-600",
  }
];

export default function NextStepsGuideModal({ open, onOpenChange, kind, dangerLevel }: NextStepsGuideModalProps) {
  const isNews = kind === "news";
  const isDanger = dangerLevel === "danger";
  const isSafe = dangerLevel === "safe";
  const title = isNews
    ? (isDanger ? "Tin giả/lừa đảo — bạn nên làm gì?" : isSafe ? "Kết quả an toàn — lưu ý" : "Nghi ngờ tin giả — bạn nên làm gì?")
    : (isDanger ? "Link lừa đảo — bạn nên làm gì?" : isSafe ? "Kết quả an toàn — lưu ý" : "Nghi ngờ link lừa đảo — bạn nên làm gì?");
  const intro = isSafe
    ? "Kết quả này an toàn nhưng hãy luôn thận trọng. Dưới đây là các thói quen hay giúp bạn tránh bẫy lừa đảo trong tương lai."
    : isNews
      ? "Hệ thống nghi ngờ nội dung này là tin giả hoặc lừa đảo. Hãy bình tĩnh làm theo các bước dưới đây để bảo vệ bản thân và người thân."
      : "Hệ thống nghi ngờ đây là link lừa đảo/không an toàn. Đừng hoảng loạn — làm lần lượt theo hướng dẫn."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDanger ? "bg-red-100 text-red-600" : isSafe ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-gray-950">{title}</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">{intro}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {ACTION_CALLOUTS.map((s) => (
            <div key={s.title} className={`rounded-2xl border p-4 ${s.color}`}>
              <div className="flex items-center gap-2.5">
                <s.icon className={`h-5 w-5 shrink-0 ${s.iconColor}`} />
                <p className="text-sm font-black uppercase tracking-wide text-gray-900">{s.title}</p>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {s.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isDanger ? "bg-red-400" : isSafe ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">Quy tắc vàng: 3 KHÔNG — KHÔNG NHẤP · KHÔNG NHẬP · KHÔNG CHUYỂN</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Nếu bạn đã chuyển tiền hoặc cung cấp OTP, hãy báo ngay ngân hàng và trình báo công an càng sớm càng tốt.
                Nếu bạn thấy cảnh báo này là Sai, hãy dùng nút <strong>"Báo kết quả sai (khiếu nại)"</strong> để đội ngũ xem xét lại.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}