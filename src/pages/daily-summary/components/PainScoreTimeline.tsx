import React from 'react';
import Icon from '../../../components/AppIcon';
import { PainAssessment } from '../types';

interface PainScoreTimelineProps {
  data: PainAssessment[];
}

const PainScoreTimeline: React.FC<PainScoreTimelineProps> = ({ data }) => {
  if (!data?.length) return null;

  const getScoreColor = (score: number) => {
    if (score <= 2) return '#16a34a';
    if (score <= 4) return '#d97706';
    return '#dc2626';
  };

  const maxScore = 10;
  const chartHeight = 120;

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}>
            <Icon name="TrendingUp" size={20} style={{ color: '#40352C' }} />
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>Pain Score Timeline</h3>
            <p className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>Behavioral pain assessment over time</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{data[data.length - 1]?.score || 0}</div>
          <div className="text-xs" style={{ color: 'rgba(64,53,44,0.45)' }}>Current Score</div>
        </div>
      </div>

      <div className="relative h-32 mb-4">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[10, 5, 0].map((val) => (
            <div key={val} className="flex items-center gap-2">
              <span className="text-xs w-4" style={{ color: 'rgba(64,53,44,0.4)' }}>{val}</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(64,53,44,0.06)' }} />
            </div>
          ))}
        </div>

        <svg className="absolute inset-0 ml-6" viewBox={`0 0 ${data.length * 50} ${chartHeight}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="painGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#40352C" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#40352C" stopOpacity="0" />
            </linearGradient>
          </defs>

          {data.length > 1 && (
            <>
              <path
                d={`M 0,${chartHeight} ${data.map((d, i) =>
                  `L ${i * 50 + 25},${chartHeight - (d.score / maxScore) * chartHeight}`
                ).join(' ')} L ${(data.length - 1) * 50 + 25},${chartHeight} Z`}
                fill="url(#painGradient)"
              />
              <path
                d={`M ${data.map((d, i) =>
                  `${i * 50 + 25},${chartHeight - (d.score / maxScore) * chartHeight}`
                ).join(' L ')}`}
                fill="none"
                stroke="#40352C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {data.map((d, i) => (
            <circle
              key={i}
              cx={i * 50 + 25}
              cy={chartHeight - (d.score / maxScore) * chartHeight}
              r="5"
              fill={getScoreColor(d.score)}
              stroke="#F8F6F2"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-xs mb-6 ml-6" style={{ color: 'rgba(64,53,44,0.45)' }}>
        {data.map((d, i) => (
          <span key={i}>{d.time}</span>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { range: '0', label: 'None', color: '#16a34a' },
          { range: '1-2', label: 'Mild', color: '#16a34a' },
          { range: '3-4', label: 'Moderate', color: '#d97706' },
          { range: '5-6', label: 'Significant', color: '#d97706' },
          { range: '7-10', label: 'Severe', color: '#dc2626' },
        ].map((item) => (
          <div key={item.range} className="text-center">
            <div className="h-1.5 rounded-full mb-1" style={{ backgroundColor: item.color }} />
            <span className="text-[10px]" style={{ color: 'rgba(64,53,44,0.45)' }}>{item.range}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium" style={{ color: 'rgba(64,53,44,0.6)' }}>Recent Behaviors Observed:</p>
        <div className="flex flex-wrap gap-2">
          {data[data.length - 1]?.behaviors.map((behavior, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(64,53,44,0.06)', border: '1px solid rgba(64,53,44,0.1)', color: 'rgba(64,53,44,0.6)' }}
            >
              {behavior}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PainScoreTimeline;
