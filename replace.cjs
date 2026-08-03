const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');


code = code.replace(
  'import { useState, useEffect, FormEvent } from "react";',
  'import { useState, useEffect, FormEvent, useRef } from "react";'
);


code = code.replace(
  'import { motion, AnimatePresence } from "motion/react";',
  'import { motion, AnimatePresence, animate } from "motion/react";'
);


const countingNumberCode = `
function CountingNumber({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(0, value, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate(v) {
          node.textContent = v.toFixed(0);
        }
      });
      return () => controls.stop();
    }
  }, [value]);

  return <span ref={nodeRef}>{value}</span>;
}
`;

code = code.replace('export default function App() {', countingNumberCode + '\nexport default function App() {');


const oldScoreStart = code.indexOf('<div className={`liquid-container');
const oldScoreEnd = code.indexOf('</div>', code.indexOf('</span>', oldScoreStart)) + 6;

const scoreReplacement = `
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" stroke="#f3f4f6" strokeWidth="8" fill="none" />
                            <motion.circle 
                              cx="50" cy="50" r="45" 
                              stroke={resultData.isSafe ? "#22c55e" : resultData.isWarning ? "#fbbf24" : "#ef4444"} 
                              strokeWidth="8" 
                              fill="none" 
                              strokeLinecap="round"
                              initial={{ strokeDashoffset: 283 }}
                              animate={{ strokeDashoffset: 283 - (283 * resultData.score) / 100 }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              style={{ strokeDasharray: 283 }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl font-black tracking-tighter text-gray-800 drop-shadow-sm flex items-baseline">
                              <CountingNumber value={resultData.score} /><span className="text-xl">%</span>
                            </span>
                          </div>
                        </div>`;

code = code.replace(/<div className=\{`liquid-container[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, scoreReplacement + '\n                      </div>\n                    </div>');

fs.writeFileSync('src/App.tsx', code);
console.log('Successfully applied CountingNumber UI');
