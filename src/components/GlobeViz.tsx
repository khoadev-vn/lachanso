import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Sphere,
  Marker,
  Line } from
"react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";


const VN_TARGETS = [
{ coordinates: [105.834, 21.028] as [number, number], label: "Hà Nội", type: "shield" },
{ coordinates: [106.629, 10.823] as [number, number], label: "TP. HCM", type: "shield" },
{ coordinates: [108.202, 16.054] as [number, number], label: "Đà Nẵng", type: "shield" }];


const STATIC_MARKERS = [
...VN_TARGETS,
{ coordinates: [139.692, 35.689] as [number, number], label: "Tokyo", type: "db" },
{ coordinates: [-122.419, 37.774] as [number, number], label: "San Francisco", type: "db" },
{ coordinates: [-0.127, 51.507] as [number, number], label: "London", type: "db" },
{ coordinates: [103.820, 1.352] as [number, number], label: "Singapore", type: "db" }];


const ICON_PATHS: Record<string, string> = {
  user: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-3.3 0-6 1.3-6 3v1h12v-1c0-1.7-2.7-3-6-3z",
  shield: "M8 1L2 3.5V7c0 3.6 2.5 6.9 6 7.8C11.5 13.9 14 10.6 14 7V3.5L8 1zm-1 8.4L4.6 7l1-1 1.4 1.4 3.4-3.4 1 1L7 9.4z",
  db: "M8 1C4.7 1 2 2.3 2 4v8c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3zm0 2c2.8 0 4 .8 4 1s-1.2 1-4 1-4-.8-4-1 1.2-1 4-1z",
  threat: "M8 0L0 4v6c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V4L8 0zm0 13c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm2.5-7.5L7 9.5 5.5 8 4 9.5 7 12.5 12 7.5l-1.5-2z"
};

function MarkerIcon({ type }: {type: string;}) {
  const color = type === 'threat' ? '#ef4444' : '#ff8904';
  const glow = type === 'threat' ? 'rgba(239,68,68,0.8)' : 'rgba(255,137,4,0.8)';
  return (
    <g>
      <circle r={10} fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}
      style={{ filter: `drop-shadow(0 0 6px ${glow})` }} />
      <path
        d={ICON_PATHS[type] ?? ICON_PATHS.user}
        fill="white"
        transform="translate(-8,-8) scale(1)" />
      
    </g>);

}

interface ThreatArc {
  id: number;
  from: [number, number];
  to: [number, number];
  progress: number;
  color: string;
}

export default function GlobeViz() {
  const [rotation, setRotation] = useState<[number, number, number]>([-103, -15, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const [threatArcs, setThreatArcs] = useState<ThreatArc[]>([]);
  const lastPos = useRef<{x: number;y: number;} | null>(null);
  const autoRotateRef = useRef<number | null>(null);
  const threatsRef = useRef<ThreatArc[]>([]);
  const lastThreatSpawn = useRef<number>(0);


  const getRandomCoords = useCallback((): [number, number] => {
    return [
    (Math.random() - 0.5) * 360,
    (Math.random() - 0.5) * 160];

  }, []);

  const spawnThreat = useCallback((now: number) => {
    if (now - lastThreatSpawn.current > 1500) {
      const target = VN_TARGETS[Math.floor(Math.random() * VN_TARGETS.length)].coordinates;
      const origin = getRandomCoords();
      const newThreat: ThreatArc = {
        id: Math.random(),
        from: origin,
        to: target,
        progress: 0,
        color: Math.random() > 0.5 ? "#ef4444" : "#f59e0b"
      };
      threatsRef.current = [...threatsRef.current, newThreat];
      lastThreatSpawn.current = now;
    }
  }, [getRandomCoords]);

  const startAutoRotate = useCallback(() => {
    if (autoRotateRef.current) cancelAnimationFrame(autoRotateRef.current);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;


      if (!isDragging) {
        setRotation(([x, y, z]) => [x + dt * 0.015, y, z]);
      }


      spawnThreat(now);
      threatsRef.current = threatsRef.current.
      map((t) => ({ ...t, progress: t.progress + dt * 0.0005 })).
      filter((t) => t.progress < 1.5);
      setThreatArcs(threatsRef.current);

      autoRotateRef.current = requestAnimationFrame(tick);
    };
    autoRotateRef.current = requestAnimationFrame(tick);
  }, [isDragging, spawnThreat]);

  const stopAutoRotate = useCallback(() => {
    if (autoRotateRef.current) {
      cancelAnimationFrame(autoRotateRef.current);
      autoRotateRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoRotate();
    return () => stopAutoRotate();
  }, [startAutoRotate, stopAutoRotate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !lastPos.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setRotation(([x, y, z]) => [x + dx * 0.4, Math.max(-60, Math.min(60, y - dy * 0.4)), z]);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    lastPos.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !lastPos.current) return;
    const dx = e.touches[0].clientX - lastPos.current.x;
    const dy = e.touches[0].clientY - lastPos.current.y;
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setRotation(([x, y, z]) => [x + dx * 0.4, Math.max(-60, Math.min(60, y - dy * 0.4)), z]);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastPos.current = null;
  };

  return (
    <div
      className="relative w-full select-none"
      style={{ height: 560, cursor: isDragging ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm border border-red-500/30 rounded px-3 py-2 text-xs font-mono text-red-400">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
          THREAT INTELLIGENCE ACTIVE
        </div>
        <div className="bg-black/60 backdrop-blur-sm border border-orange-500/30 rounded px-3 py-2 text-xs font-mono text-orange-400">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2"></span>
          {threatArcs.length} ACTIVE THREATS
        </div>
      </div>

      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ rotate: rotation, scale: 260 }}
        width={800}
        height={560}
        style={{ width: "100%", height: "100%" }}>
        
        <Sphere id="sphere" fill="#1a1a1a" stroke="rgba(255,137,4,0.15)" strokeWidth={0.5} />
        <Graticule stroke="rgba(255,137,4,0.1)" strokeWidth={0.5} step={[30, 30]} />
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
          geographies.map((geo) =>
          <Geography
            key={geo.rsmKey}
            geography={geo}
            fill="rgba(255,137,4,0.18)"
            stroke="rgba(255,137,4,0.45)"
            strokeWidth={0.4}
            style={{ default: { outline: "none" }, hover: { outline: "none", fill: "rgba(255,137,4,0.35)" }, pressed: { outline: "none" } }} />

          )
          }
        </Geographies>

        {threatArcs.map((arc) => {

          const opacity = arc.progress < 1 ? 0.8 : Math.max(0, 0.8 - (arc.progress - 1) * 2);

          return (
            <g key={arc.id}>
              <Line
                from={arc.from}
                to={arc.to}
                stroke={arc.color}
                strokeWidth={1.5}
                strokeOpacity={opacity * 0.3}
                strokeLinecap="round" />
              
              {}
              <circle
                cx={0} cy={0} r={0} />

              
            </g>);

        })}

        {STATIC_MARKERS.map((m) =>
        <Marker key={m.label} coordinates={m.coordinates}>
            <MarkerIcon type={m.type} />
            <text
            y={20}
            textAnchor="middle"
            fontSize={7}
            fontWeight={700}
            fill="white"
            style={{ fontFamily: "sans-serif", pointerEvents: "none" }}>
            
              {m.label}
            </text>
          </Marker>
        )}
      </ComposableMap>

      <div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(to top, #111 0%, transparent 100%)" }} />
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/30 font-mono tracking-widest pointer-events-none select-none">
        KÉO ĐỂ XOAY · DRAG TO ROTATE
      </div>
    </div>);

}
