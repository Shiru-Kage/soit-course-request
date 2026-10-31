import React, { useState, useMemo } from 'react';
import { MIN_STUDENT_THRESHOLD } from '../data/courses';
import { Sparkles, Users, ArrowUpRight, Flame, CheckCircle2 } from 'lucide-react';

/**
 * DemandConstellation Component
 * Interactive topological constellation radar visualizing course petition demand
 * across SOIT academic clusters (CS, IT, DS, EMC, IS).
 */
export default function DemandConstellation({ coursesWithDemand = [], onSelectCourse }) {
  const [selectedCluster, setSelectedCluster] = useState('ALL');
  const [hoveredCourse, setHoveredCourse] = useState(null);

  const CLUSTERS = [
    { id: 'ALL', name: 'All Tracks', color: '#fbbf24' },
    { id: 'CS', name: 'Computer Science', color: '#ef4444', angle: 0 },
    { id: 'IT', name: 'Information Tech', color: '#3b82f6', angle: 72 },
    { id: 'DS', name: 'Data Science', color: '#8b5cf6', angle: 144 },
    { id: 'EMC', name: 'Entertainment & Multimedia', color: '#ec4899', angle: 216 },
    { id: 'IS', name: 'Information Systems', color: '#10b981', angle: 288 }
  ];

  // Map courses to orbital positions based on their department
  const constellationNodes = useMemo(() => {
    const center = { x: 400, y: 350 };
    const filtered = coursesWithDemand.filter(c => {
      if (selectedCluster === 'ALL') return true;
      return c.dept === selectedCluster || (c.code && c.code.startsWith(selectedCluster));
    });

    return filtered.map((c, idx) => {
      const count = c.count || c.requestCount || 0;
      const isMet = count >= MIN_STUDENT_THRESHOLD;
      const isNear = count >= 10 && count < MIN_STUDENT_THRESHOLD;
      
      // Determine cluster angle
      const clusterObj = CLUSTERS.find(cl => cl.id === (c.dept || 'CS')) || CLUSTERS[1];
      const baseAngle = (clusterObj.angle || 0) * (Math.PI / 180);
      
      // Jitter angle slightly for each course in cluster
      const jitter = ((idx % 7) - 3) * 0.14;
      const finalAngle = baseAngle + jitter;

      // Orbit radius: higher demand courses orbit closer to the luminous center hub!
      // Base radius ~260px down to ~110px for high-demand courses
      const demandRatio = Math.min(count / MIN_STUDENT_THRESHOLD, 1.2);
      const orbitRadius = 260 - demandRatio * 130 + ((idx % 3) * 18);

      const x = center.x + Math.cos(finalAngle) * orbitRadius;
      const y = center.y + Math.sin(finalAngle) * orbitRadius;

      // Node size proportional to demand
      const nodeRadius = Math.max(9, Math.min(22, 9 + count * 0.9));

      return {
        ...c,
        x,
        y,
        count,
        isMet,
        isNear,
        nodeRadius,
        color: isMet ? '#10b981' : isNear ? '#f59e0b' : clusterObj.color
      };
    });
  }, [coursesWithDemand, selectedCluster]);

  return (
    <div className="dossier-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Constellation Header & Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', zIndex: 3, position: 'relative' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--gold-bright)' }} />
            SOIT Demand Constellation Radar
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginBottom: 0 }}>
            Luminous orbital map of student petitions. High-demand courses gravitate toward the glowing center.
          </p>
        </div>

        <div className="dept-chip-rack">
          {CLUSTERS.map(cl => (
            <button
              key={cl.id}
              type="button"
              className={`dept-chip ${selectedCluster === cl.id ? 'active' : ''}`}
              onClick={() => setSelectedCluster(cl.id)}
              style={{
                borderColor: selectedCluster === cl.id ? cl.color : undefined,
                color: selectedCluster === cl.id ? '#ffffff' : undefined
              }}
            >
              {cl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive SVG Radar Surface */}
      <div style={{ position: 'relative', width: '100%', height: '540px', background: 'radial-gradient(circle at center, rgba(17, 24, 39, 0.7) 0%, rgba(9, 12, 20, 0.95) 100%)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', overflow: 'hidden' }}>
        <svg 
          viewBox="0 0 800 700" 
          style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
        >
          <defs>
            {/* Center Core Glow */}
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#b91c1c" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            
            {/* Node Filters */}
            <filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Concentric Radar Rings */}
          <circle cx="400" cy="350" r="280" fill="none" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 6" />
          <circle cx="400" cy="350" r="210" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
          <circle cx="400" cy="350" r="140" fill="none" stroke="rgba(245, 158, 11, 0.1)" strokeWidth="1.5" />
          <circle cx="400" cy="350" r="70" fill="url(#hubGlow)" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" />

          {/* Orbital Cluster Axes */}
          <line x1="400" y1="70" x2="400" y2="630" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="120" y1="350" x2="680" y2="350" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

          {/* Central Section Threshold Hub */}
          <g transform="translate(400, 350)">
            <circle r="22" fill="#7f1d1d" opacity="0.6" />
            <circle r="12" fill="#f59e0b" opacity="0.8" />
            <text textAnchor="middle" dy="4" fill="#ffffff" fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
              15+
            </text>
            <text textAnchor="middle" dy="36" fill="var(--gold-bright)" fontSize="10" fontWeight="700">
              OPENING ZONE
            </text>
          </g>

          {/* Constellation Connection Rays (connecting high demand nodes) */}
          {constellationNodes
            .filter(n => n.count >= 8)
            .map((node, i) => (
              <line
                key={`ray-${i}`}
                x1="400"
                y1="350"
                x2={node.x}
                y2={node.y}
                stroke={node.color}
                strokeWidth={node.isMet ? 1.5 : 0.75}
                strokeOpacity={node.isMet ? 0.35 : 0.15}
                strokeDasharray={node.isMet ? 'none' : '3 3'}
              />
            ))}

          {/* Course Constellation Nodes */}
          {constellationNodes.map((node) => {
            const isHovered = hoveredCourse?.code === node.code;

            return (
              <g
                key={node.code}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredCourse(node)}
                onMouseLeave={() => setHoveredCourse(null)}
                onClick={() => onSelectCourse && onSelectCourse(node)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
              >
                {/* Outer Breathing Halo for Hot/Met Courses */}
                {(node.isMet || node.isNear) && (
                  <circle
                    r={node.nodeRadius + 6}
                    fill={node.color}
                    opacity={node.isMet ? 0.25 : 0.18}
                  >
                    <animate
                      attributeName="r"
                      values={`${node.nodeRadius + 3};${node.nodeRadius + 8};${node.nodeRadius + 3}`}
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node Solid Circle */}
                <circle
                  r={node.nodeRadius}
                  fill={node.color}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1}
                  filter="url(#nodeGlow)"
                  opacity={isHovered ? 1 : 0.88}
                />

                {/* Inner Petition Count */}
                <text
                  textAnchor="middle"
                  dy="3.5"
                  fill="#ffffff"
                  fontSize={node.nodeRadius > 14 ? '10' : '8'}
                  fontWeight="800"
                  fontFamily="var(--font-mono)"
                  pointerEvents="none"
                >
                  {node.count}
                </text>

                {/* Course Code Label */}
                <text
                  textAnchor="middle"
                  dy={node.nodeRadius + 14}
                  fill={isHovered ? '#ffffff' : 'var(--text-muted)'}
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  pointerEvents="none"
                >
                  {node.code}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Interactive Holographic Tooltip */}
        {hoveredCourse && (
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              right: '1rem',
              maxWidth: '300px',
              padding: '1rem 1.15rem',
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${hoveredCourse.color}`,
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              zIndex: 10,
              pointerEvents: 'none',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span className="course-mono-code" style={{ fontSize: '0.9rem' }}>
                {hoveredCourse.code}
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: hoveredCourse.isMet ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: hoveredCourse.isMet ? 'var(--emerald-core)' : '#f59e0b'
              }}>
                {hoveredCourse.isMet ? '15+ Threshold Met' : `${Math.max(0, MIN_STUDENT_THRESHOLD - hoveredCourse.count)} more needed`}
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', lineHeight: 1.3 }}>
              {hoveredCourse.title}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Cluster: <strong>{hoveredCourse.dept || 'SOIT'}</strong></span>
              <span><strong>{hoveredCourse.count}</strong> / 15 Petitions</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
