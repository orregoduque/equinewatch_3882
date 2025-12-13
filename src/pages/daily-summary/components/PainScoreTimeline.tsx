import React from 'react';
import Icon from '../../../components/AppIcon';
import { PainAssessment } from '../types';

interface PainScoreTimelineProps {
  data: PainAssessment[];
}

const PainScoreTimeline: React.FC<PainScoreTimelineProps> = ({ data }) => {
  if (!data?.length) return null;
  
  const getScoreColor = (score: number) => {
    if (score <= 2) return '#4a9d6b';
    if (score <= 4) return '#d4a84b';
    return '#c75050';
  };

  const getScoreLabel = (score: number) => {
    if (score === 0) return 'No Pain';
    if (score <= 2) return 'Mild';
    if (score <= 4) return 'Moderate';
    if (score <= 6) return 'Significant';
    return 'Severe';
  };

  const maxScore = 10;
  const chartHeight = 120;

  return (
    <div className="glass-card p-6 luxury-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#c9a962]/10">
            <Icon name="TrendingUp" size={20} className="text-[#c9a962]" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-[#faf9f6]">Pain Score Timeline</h3>
            <p className="text-sm text-[#6b6b6b]">Behavioral pain assessment over time</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-light text-[#faf9f6]">{data[data.length - 1]?.score || 0}</div>
          <div className="text-xs text-[#6b6b6b]">Current Score</div>
        </div>
      </div>

      <div className="relative h-32 mb-4">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[10, 5, 0].map((val) => (
            <div key={val} className="flex items-center gap-2">
              <span className="text-xs text-[#6b6b6b] w-4">{val}</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          ))}
        </div>

        <svg className="absolute inset-0 ml-6" viewBox={`0 0 ${data.length * 50} ${chartHeight}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="painGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c9a962" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c9a962" stopOpacity="0" />
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
                stroke="#c9a962"
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
              stroke="#0a0a0f"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-xs text-[#6b6b6b] mb-6 ml-6">
        {data.map((d, i) => (
          <span key={i}>{d.time}</span>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { range: '0', label: 'None', color: '#4a9d6b' },
          { range: '1-2', label: 'Mild', color: '#4a9d6b' },
          { range: '3-4', label: 'Moderate', color: '#d4a84b' },
          { range: '5-6', label: 'Significant', color: '#d4a84b' },
          { range: '7-10', label: 'Severe', color: '#c75050' },
        ].map((item) => (
          <div key={item.range} className="text-center">
            <div className="h-1.5 rounded-full mb-1" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-[#6b6b6b]">{item.range}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[#a8a8a8]">Recent Behaviors Observed:</p>
        <div className="flex flex-wrap gap-2">
          {data[data.length - 1]?.behaviors.map((behavior, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-full bg-white/5 border border-[#c9a962]/10 text-[#a8a8a8]">
              {behavior}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PainScoreTimeline;
