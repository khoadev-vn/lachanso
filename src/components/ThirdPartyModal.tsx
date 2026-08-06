import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ShieldCheck, AlertTriangle, Info, Monitor, Globe, Server, MapPin } from "lucide-react";

export interface BackendThirdPartySource {
  source: string;
  name: string;
  listed: boolean;
  severity: "high" | "clear" | "unknown";
  detail: string;
  item?: {
    domain?: string;
    detectedDate?: string | null;
    org?: string | null;
    orgSlug?: string | null;
    status?: string | null;
    type?: string | null;
  };
}

export interface BackendIpInfoDetail {
  hostname: string;
  ips: string[];
  hosting: boolean | null;
  isp: string | null;
  org: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  asn: string | null;
  asName: string | null;
  rdapCidr: string | null;
  rdapName: string | null;
}

interface WebThumbModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thirdParty?: BackendThirdPartySource[];
  ipInfo?: { collected: boolean; detail: BackendIpInfoDetail } | null;
}

function sevStyle(sev: string) {
  if (sev === "high") return "border-red-200 bg-red-50/70 text-red-800";
  if (sev === "warning") return "border-amber-200 bg-amber-50/70 text-amber-800";
  if (sev === "clear") return "border-emerald-200 bg-emerald-50/70 text-emerald-800";
  return "border-gray-100 bg-gray-50/70 text-gray-700";
}
function sevIcon(sev: string) {
  if (sev === "high") return <AlertTriangle className="h-4 w-4 text-red-600" />;
  if (sev === "clear") return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
  return <Info className="h-4 w-4 text-gray-500" />;
}
function sevLabel(sev: string) {
  if (sev === "high") return "Có dấu hiệu";
  if (sev === "clear") return "Không ghi nhận";
  return "Chưa xác định";
}

export default function WebThumbModal({ open, onOpenChange, thirdParty, ipInfo }: WebThumbModalProps) {
  const sources = thirdParty || [];
  const detail = ipInfo?.detail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight text-gray-950">Kết quả kiểm tra từ bên thứ 3</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-500">
            Đối chiếu domain với các nguồn cảnh báo lừa đảo độc lập (truy vấn trực tiếp từ máy chủ LCS).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-600">
              Chưa có dữ liệu từ bên thứ ba trong lần kiểm tra này.
            </div>
          ) : sources.map((s, idx) => (
            <div key={idx} className={`rounded-2xl border p-4 ${sevStyle(s.severity)}`}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {sevIcon(s.severity)}
                  <span className="text-sm font-black">{s.name}</span>
                </div>
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-black uppercase">{sevLabel(s.severity)}</span>
              </div>
              <p className="text-sm leading-relaxed opacity-90">{s.detail}</p>
              {s.item && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {s.item.org && <div className="rounded-lg bg-white/70 px-3 py-2"><span className="font-black opacity-60">Mạo danh:</span> {s.item.org}</div>}
                  {s.item.detectedDate && <div className="rounded-lg bg-white/70 px-3 py-2"><span className="font-black opacity-60">Phát hiện:</span> {s.item.detectedDate}</div>}
                  {s.item.status && <div className="rounded-lg bg-white/70 px-3 py-2"><span className="font-black opacity-60">Trạng thái:</span> {s.item.status}</div>}
                  {s.item.type && <div className="rounded-lg bg-white/70 px-3 py-2"><span className="font-black opacity-60">Loại:</span> {s.item.type === "social" ? "Mạng xã hội" : "Website"}</div>}
                </div>
              )}
            </div>
          ))}
        </div>

        {detail && detail.ips?.length > 0 && (
          <>
            <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Server className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-black text-gray-900">Thông tin chi tiết IP</span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-lg bg-white p-2.5"><Globe className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" /><div><span className="block text-[10px] font-black uppercase opacity-50">Địa chỉ IP</span>{detail.ips.join(", ")}</div></div>
                {detail.org && <InfoRow icon={Monitor} label="Tổ chức" value={detail.org} />}
                {detail.isp && <InfoRow icon={Server} label="ISP" value={detail.isp} />}
                {detail.asn && <InfoRow icon={Server} label="ASN" value={detail.asn} />}
                {(detail.country || detail.region || detail.city) && <InfoRow icon={MapPin} label="Vị trí" value={[detail.city, detail.region, detail.country].filter(Boolean).join(", ")} />}
                {detail.rdapName && <InfoRow icon={Globe} label="Nhà mạng (RDAP)" value={detail.rdapName} />}
                {detail.rdapCidr && <InfoRow icon={Globe} label="Dải IP (CIDR)" value={detail.rdapCidr} />}
                <div className="flex items-start gap-2 rounded-lg bg-white/70 p-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" /><div><span className="block text-[10px] font-black uppercase opacity-50">Hạ tầng lưu trữ</span>{detail.hosting ? "Datacenter / host nhà cung cấp" : "Tiêu dùng / doanh nghiệp"}</div></div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-white/70 p-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
      <div><span className="block text-[10px] font-black uppercase opacity-50">{label}</span>{value}</div>
    </div>
  );
}