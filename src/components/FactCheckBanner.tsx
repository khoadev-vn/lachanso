import { AlertTriangle } from "lucide-react";

export default function FactCheckBanner() {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border-2 border-red-500 bg-red-50 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse">
      <div className="flex flex-col md:flex-row items-center gap-4 px-6 py-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-black uppercase tracking-tight text-red-700">
            CẢNH BÁO NGUY HIỂM
          </h3>
          <p className="mt-1 text-base font-medium leading-relaxed text-red-900">
            Nội dung này đã được xác nhận là <span className="font-bold underline decoration-2 underline-offset-4">SAI SỰ THẬT/LỪA ĐẢO</span>. Tuyệt đối không chia sẻ!
          </p>
        </div>
      </div>
    </div>
  );
}
// redeploy
