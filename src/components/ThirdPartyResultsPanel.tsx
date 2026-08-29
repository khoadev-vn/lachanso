import type { BackendThirdPartySource, BackendIpInfoDetail } from "./ThirdPartyModal";
import { useLang } from "../contexts/LangContext";

interface ThirdPartyResultsProps {
  thirdParty?: BackendThirdPartySource[];
  ipInfo?: { collected: boolean; detail: BackendIpInfoDetail } | null;
}

function sevBadge(sev: string, t: (key: string) => string): { label: string; cls: string } {
  if (sev === "high") return { label: t('thirdParty.hasSigns'), cls: "bg-red-600 text-white" };
  if (sev === "clear") return { label: t('thirdParty.notDetected'), cls: "bg-gray-700 text-white" };
  return { label: t('thirdParty.identified'), cls: "bg-orange-500 text-white" };
}

export default function ThirdPartyResultsPanel({ thirdParty, ipInfo }: ThirdPartyResultsPanelProps) {
  const { t } = useLang();
  const sources = thirdParty || [];
  const detail = ipInfo?.detail;

  return (
    <div className="rounded-3xl border-2 border-orange-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-4">
        <h3 className="text-lg font-black tracking-tight text-gray-950">{t('thirdParty.title')}</h3>
        <span className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase text-white">
          {sources.length} {t('thirdParty.sources')}
        </span>
      </div>

      {sources.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{t('thirdParty.noData')}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {sources.map((s, idx) => {
            const badge = sevBadge(s.severity || "", t);
            return (
              <div key={idx} className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-gray-950">{s.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${badge.cls}`}>{badge.label}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{s.detail}</p>
                {s.item && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {s.item.org && <div className="rounded-lg bg-white px-3 py-2"><span className="font-black text-gray-400">{t('thirdParty.impersonating')}:</span> <span className="text-gray-800">{s.item.org}</span></div>}
                    {s.item.detectedDate && <div className="rounded-lg bg-white px-3 py-2"><span className="font-black text-gray-400">{t('thirdParty.detected')}:</span> <span className="text-gray-800">{s.item.detectedDate}</span></div>}
                    {s.item.status && <div className="rounded-lg bg-white px-3 py-2"><span className="font-black text-gray-400">{t('thirdParty.status')}:</span> <span className="text-gray-800">{s.item.status}</span></div>}
                    {s.item.type && <div className="rounded-lg bg-white px-3 py-2"><span className="font-black text-gray-400">{t('thirdParty.type')}:</span> <span className="text-gray-800">{s.item.type === "social" ? t('thirdParty.socialMedia') : t('thirdParty.website')}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {detail && detail.ips?.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
          <div className="mb-3 text-sm font-black uppercase tracking-wide text-orange-600">{t('ip.title')}</div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-white p-2.5"><div className="block text-[10px] font-black uppercase text-gray-400">{t('ip.address')}</div><div className="text-gray-900">{detail.ips.join(", ")}</div></div>
            {detail.org ? <Row label={t('ip.organization')} value={detail.org} /> : null}
            {detail.isp ? <Row label={t('ip.organization')} value={detail.isp} /> : null}
            {detail.asn ? <Row label={t('ip.asn')} value={detail.asn} /> : null}
            {(detail.country || detail.region || detail.city) ? <Row label={t('ip.location')} value={[detail.city, detail.region, detail.country].filter(Boolean).join(", ")} /> : null}
            {detail.rdapName ? <Row label={t('ip.rdapProvider')} value={detail.rdapName} /> : null}
            {detail.rdapCidr ? <Row label={t('ip.cidr')} value={detail.rdapCidr} /> : null}
            <div className="rounded-lg bg-white p-2.5"><div className="block text-[10px] font-black uppercase text-gray-400">{t('ip.hosting')}</div><div className="text-gray-900">{detail.hosting ? t('ip.datacenter') : t('ip.residential')}</div></div>
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
