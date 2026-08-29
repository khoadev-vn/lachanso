import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ShieldCheck, AlertTriangle, X } from "lucide-react";
import { useLang } from "../contexts/LangContext";

interface ColorLegendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ColorLegendModal({ open, onOpenChange }: ColorLegendModalProps) {
  const { t } = useLang();
  
  const states = [
    {
      label: `🔴 ${t('legend.danger')}`,
      color: "text-red-700 bg-red-50 border-red-200",
      dot: "bg-red-500",
      desc: t('legend.dangerDesc')
    },
    {
      label: `🟡 ${t('legend.insufficient')}`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      desc: t('legend.insufficientDesc')
    },
    {
      label: `🟢 ${t('legend.safe')}`,
      color: "text-green-700 bg-green-50 border-green-200",
      dot: "bg-green-500",
      desc: t('legend.safeDesc')
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight text-gray-950">{t('legend.title')}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-500">
            {t('legend.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {states.map((s) => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${s.dot}`} />
                <span className="text-sm font-black uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{s.desc}</p>
            </div>
          ))}

          <div className="flex items-start gap-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p>
              {t('legend.disclaimer')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
