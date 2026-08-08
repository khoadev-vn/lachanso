import type { BackendThirdPartySource, BackendIpInfoDetail } from "./ThirdPartyModal";

interface ThirdPartyResultsProps {
  thirdParty?: BackendThirdPartySource[];
  ipInfo?: { collected: boolean; detail: BackendIpInfoDetail } | null;
}

function sevBadge(sev: string): { label: string; cls: string } {
  if (sev === "high") return { label: "Có dấu hiệu", cls: "bg-red-600 text-white" };
  if (sev === "clear") return { label: "Không ghi nhận", cls: "bg-gray-700 text-white" };
  return { label: "Chưa xác định", cls: "bg-orange-500 text-white" };
}

export default function ThirdPartyResultsPanel({ thirdParty, ipInfo }: ThirdPartyResultsPanelProps) {
  const sources = thirdParty || [];
  const detail = ipInfo?.detail;

  return (
    <div className="rounded-3xl border-2 border-orange-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-4">
        <h3 className="text-lg font-black tracking-tight text-gray-950">Kết quả kiểm tra từ bên thứ 3</h3>
        <span className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase text-white">
          {sources.length} nguồn
        </span>
      </div>

      {sources.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Chưa có dữ liệu từ bên thứ ba trong lần kiểm tra này.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {sources.map((s, idx) => {
            const badge = sevBadge(s.severity || "");
            return (
              <div key={idx} className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-gray-950">{s.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${badge.cls}`}>{badge.label}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{s.detail}</p>
                {s.item && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {s.item.org && <div className="rounded-lg bg-white px-3 py-2"><span className="font-black text-gray-400">Mạo danh:</span> <span className="text-gray-800">{s.item.org}</span></div>}
                    {s.item.detectedDate && <div className="rounded-lg bg-white px-3 py-2"><span className="font-black text-gray-400">Phát hiện:</span> <span className="text-gray-800">{s.item.detectedDate}</span></div>}
                    {s.item.status && <div className="rounded-lg bg-white px-3 py-2"><span className="font-black text-gray-400">Trạng thái:</span> <span className="text-gray-800">{s.item.status}</span></div>}
                    {s.item.type && <div className="rounded-lg bg-white px-3 py-2"><span className="font-black text-gray-400">Loại:</span> <span className="text-gray-800">{s.item.type === "social" ? "Mạng xã hội" : "Website"}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {detail && detail.ips?.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
          <div className="mb-3 text-sm font-black uppercase tracking-wide text-orange-600">Thông tin chi tiết IP</div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-white p-2.5"><div className="block text-[10px] font-black uppercase text-gray-400">Địa chỉ IP</div><div className="text-gray-900">{detail.ips.join(", ")}</div></div>
            {detail.org ? <Row label="Tổ chức" value={detail.org} /> : null}
            {detail.isp ? <Row label="Tổ chức" value={detail.isp} /> : null}
            {detail.asn ? <Row label="ASN" value={detail.asn} /> : null}
            {(detail.country || detail.region || detail.city) ? <Row label="Vị trí" value={[detail.city, detail.region, detail.country].filter(Boolean).join(", ")} /> : null}
            {detail.rdapName ? <Row label="Nhà mạng (RDAP)" value={detail.rdapName} /> : null}
            {detail.rdapCidr ? <Row label="Dải IP (CIDR)" value={detail.rdapCidr} /> : null}
            <div className="rounded-lg bg-white p-2.5"><div className="block text-[10px] font-black uppercase text-gray-400">Hạ tầng lưu trữ</div><div className="text-gray-900">{detail.hosting ? "Datacenter / host nhà cung cấp" : "Tiêu dùng / doanh nghiệp"}</div></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-2.5">
      <div className="block text-[10px] font-black uppercase text-gray-400">{label}</div>
      <div className="text-gray-900">{value}</div>
    </div>
  );
}