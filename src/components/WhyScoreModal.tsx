import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ShieldCheck, AlertTriangle, X, Info, ListOrdered } from "lucide-react";
import { useLang } from "../contexts/LangContext";

const translateReason = (res: any, t: (key: string) => string): any => {
  const nameKey = `reason.${res.id}`;
  const detailKey = `reason.${res.id}_detail`;
  const translatedName = t(nameKey);
  const translatedDetail = t(detailKey);
  return {
    ...res,
    name: translatedName !== nameKey ? translatedName : res.name,
    detail: translatedDetail !== detailKey ? translatedDetail : res.detail
  };
};

interface WhyReason {
  name?: string;
  detail?: string;
  status?: string;
  scoreDelta?: number;
}

interface WhyScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  score?: number;
  reasons?: WhyReason[];
}

export default function WhyScoreModal({ open, onOpenChange, title, score, reasons = [] }: WhyScoreModalProps) {
  const { t } = useLang();
  const list = reasons ?? [];
  const dangerCount = list.filter((r) => r.status === "danger").length;
  const warningCount = list.filter((r) => r.status === "warning").length;
  const cleanCount = list.filter((r) => r.status === "safe").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <ListOrdered className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-gray-950">
                {t('why.title')} {Math.round(score ?? 0)}%?
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {t('why.description')} {title ? `"${title}"` : t('why.content')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {dangerCount + warningCount + cleanCount === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
            {t('why.noSignals')}
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-red-50 px-3 py-2 text-center">
                <p className="text-lg font-black text-red-600">{dangerCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">{t('why.badSignals')}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
                <p className="text-lg font-black text-amber-600">{warningCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">{t('why.warningSignals')}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                <p className="text-lg font-black text-emerald-600">{cleanCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">{t('why.goodSignals')}</p>
              </div>
            </div>

            <ol className="max-h-[380px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {list.map((reason, idx) => {
                const translatedReason = translateReason(reason, t);
                const status = reason.status;
                const isBad = status === "danger";
                const isWarn = status === "warning";
                return (
                  <li key={idx} className={`flex items-start gap-3 rounded-2xl border p-4 ${isBad ? "border-red-200 bg-red-50/70" : isWarn ? "border-amber-200 bg-amber-50/70" : "border-emerald-200 bg-emerald-50/70"}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-sm font-black ${isBad ? "bg-red-100 text-red-700" : isWarn ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-gray-950">{translatedReason.name ?? `${t('why.signal')} ${idx + 1}`}</span>
                        {typeof reason.scoreDelta === "number" && reason.scoreDelta !== 0 && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${reason.scoreDelta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {reason.scoreDelta > 0 ? `+${reason.scoreDelta}` : reason.scoreDelta}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium leading-5 text-gray-700">{translatedReason.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        <div className="flex items-start gap-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
          {dangerCount > 0 ? <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /> : warningCount > 0 ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
          <p>
            {t('why.disclaimer')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}