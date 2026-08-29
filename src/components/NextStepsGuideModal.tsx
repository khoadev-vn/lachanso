import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ShieldAlert, ShieldBan, Lock, Share2, Search, Phone } from "lucide-react";
import { useLang } from "../contexts/LangContext";

interface NextStepsGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "web" | "news";
  dangerLevel: "danger" | "insufficient" | "safe";
}

export default function NextStepsGuideModal({ open, onOpenChange, kind, dangerLevel }: NextStepsGuideModalProps) {
  const { t } = useLang();
  const isNews = kind === "news";
  const isDanger = dangerLevel === "danger";
  const isSafe = dangerLevel === "safe";
  
  const title = isNews
    ? (isDanger ? t('nextsteps.titleFakeNewsDanger') : isSafe ? t('nextsteps.titleSafe') : t('nextsteps.titleFakeNewsInsufficient'))
    : (isDanger ? t('nextsteps.titleWebDanger') : isSafe ? t('nextsteps.titleSafe') : t('nextsteps.titleWebInsufficient'));
  
  const intro = isSafe
    ? t('nextsteps.introSafe')
    : isNews
      ? t('nextsteps.introFakeNews')
      : t('nextsteps.introWeb');

  const ACTION_CALLOUTS = [
    {
      icon: ShieldBan,
      title: t('nextsteps.never'),
      items: [
        t('nextsteps.neverItem1'),
        t('nextsteps.neverItem2'),
        t('nextsteps.neverItem3'),
        t('nextsteps.neverItem4')
      ],
      color: "border-red-200 bg-red-50/70",
      iconColor: "text-red-600",
    },
    {
      icon: Search,
      title: t('nextsteps.verify'),
      items: [
        t('nextsteps.verifyItem1'),
        t('nextsteps.verifyItem2'),
        t('nextsteps.verifyItem3')
      ],
      color: "border-blue-200 bg-blue-50/80",
      iconColor: "text-blue-600",
    },
    {
      icon: Phone,
      title: t('nextsteps.report'),
      items: [
        t('nextsteps.reportItem1'),
        t('nextsteps.reportItem2'),
        t('nextsteps.reportItem3'),
        t('nextsteps.reportItem4')
      ],
      color: "border-emerald-200 bg-emerald-50/80",
      iconColor: "text-emerald-600",
    },
    {
      icon: Lock,
      title: t('nextsteps.protect'),
      items: [
        t('nextsteps.protectItem1'),
        t('nextsteps.protectItem2'),
        t('nextsteps.protectItem3')
      ],
      color: "border-violet-200 bg-violet-50/80",
      iconColor: "text-violet-600",
    }
  ];

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
              <p className="text-sm font-black text-gray-900">{t('nextsteps.goldenRule')}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {t('nextsteps.goldenRuleDesc')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
