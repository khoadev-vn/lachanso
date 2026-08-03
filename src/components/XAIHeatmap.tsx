import React, { useMemo } from 'react';

interface XAIHeatmapProps {
  text: string;
  reasons: any[];
}

export const XAIHeatmap: React.FC<XAIHeatmapProps> = ({ text, reasons }) => {

  const keywordsToHighlight = useMemo(() => {
    const map = new Map<string, {reason: string;penalty: number;status: string;}>();
    reasons.forEach((reason) => {
      if (reason.status !== "success" && reason.detail?.includes("từ khóa:")) {
        const match = reason.detail.match(/từ khóa:\s*([^.]+)/);
        if (match && match[1]) {
          const words = match[1].split(',').map((w: string) => w.trim().replace(/\.+$/, ''));
          words.forEach((w: string) => {
            if (w.length > 2) {
              const current = map.get(w.toLowerCase());
              const penalty = reason.status === "danger" ? 50 : 20;
              if (!current || current.penalty < penalty) {
                map.set(w.toLowerCase(), {
                  reason: reason.name || "Dấu hiệu nghi vấn",
                  penalty,
                  status: reason.status
                });
              }
            }
          });
        }
      }
    });
    return map;
  }, [reasons]);


  const sentences = useMemo(() => {

    return text.split(/(?<=[.?!])\s+/);
  }, [text]);

  const renderedSentences = sentences.map((sentence, sIndex) => {

    let sentenceHeat = 0;
    const lowerSentence = sentence.toLowerCase();

    keywordsToHighlight.forEach((data, keyword) => {
      if (lowerSentence.includes(keyword)) {
        sentenceHeat += data.penalty;
      }
    });

    let sentenceStyle = "";
    if (sentenceHeat > 80) sentenceStyle = "bg-red-500/20 border-l-4 border-red-500 pl-2 text-red-900";else
    if (sentenceHeat > 40) sentenceStyle = "bg-orange-500/15 border-l-4 border-orange-500 pl-2 text-orange-900";else
    if (sentenceHeat > 0) sentenceStyle = "bg-yellow-500/10 border-l-2 border-yellow-400 pl-1 text-yellow-900";else
    sentenceStyle = "text-gray-800";


    if (keywordsToHighlight.size === 0 || sentenceHeat === 0) {
      return (
        <span key={sIndex} className={`transition-all duration-300 ${sentenceStyle} mb-1 inline-block rounded`}>
          {sentence}{' '}
        </span>);

    }

    const escapedKeywords = Array.from(keywordsToHighlight.keys()).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    escapedKeywords.sort((a, b) => b.length - a.length);
    const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');

    const parts = sentence.split(regex);

    return (
      <span key={sIndex} className={`transition-all duration-500 ${sentenceStyle} mb-2 block p-1 rounded`}>
        {parts.map((part, pIndex) => {
          const lowerPart = part.toLowerCase();
          if (keywordsToHighlight.has(lowerPart)) {
            const heatData = keywordsToHighlight.get(lowerPart)!;
            const wordColor = heatData.status === "danger" ? "bg-red-200 text-red-800 border-red-400" : "bg-orange-200 text-orange-800 border-orange-400";
            return (
              <span
                key={pIndex}
                className={`border-b-2 border-dashed ${wordColor} px-1 mx-[2px] rounded cursor-help font-semibold`}
                title={`AI XAI: ${heatData.reason}`}>
                
                {part}
              </span>);

          }
          return <span key={pIndex}>{part}</span>;
        })}
      </span>);

  });

  return (
    <div className="xai-heatmap-container font-sans text-sm leading-relaxed p-4 bg-white/50 rounded-xl border border-white/20 shadow-inner">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-widest border-b pb-2">
        <span className="flex w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        AI XAI Heatmap Analysis
      </div>
      <div className="space-y-1">
        {renderedSentences}
      </div>
    </div>);

};

export default XAIHeatmap;
