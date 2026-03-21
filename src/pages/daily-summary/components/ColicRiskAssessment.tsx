import React from 'react';
import Icon from '../../../components/AppIcon';
import { ColicRiskIndicator } from '../types';

interface ColicRiskAssessmentProps {
  indicators: ColicRiskIndicator[];
  overallScore: number;
}

const ColicRiskAssessment: React.FC<ColicRiskAssessmentProps> = ({ indicators, overallScore }) => {
  if (!indicators?.length) return null;

  const getRiskLevel = (score: number) => {
    if (score <= 30) return { label: 'Low Risk', color: '#16a34a', bg: '#16a34a' };
    if (score <= 60) return { label: 'Moderate Risk', color: '#d97706', bg: '#d97706' };
    return { label: 'High Risk', color: '#dc2626', bg: '#dc2626' };
  };

  const risk = getRiskLevel(overallScore);

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}>
            <Icon name="Shield" size={20} style={{ color: '#40352C' }} />
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>Colic Risk Assessment</h3>
            <p className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>AI-powered early warning system</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(64,53,44,0.08)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={overallScore <= 30 ? '#16a34a' : overallScore <= 60 ? '#d97706' : '#dc2626'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${overallScore * 2.64} 264`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold" style={{ color: risk.color, fontFamily: 'Syne, sans-serif' }}>{overallScore}</span>
            <span className="text-sm" style={{ color: 'rgba(64,53,44,0.45)' }}>/ 100</span>
            <span
              className="text-xs font-semibold mt-2 px-3 py-1 rounded-full"
              style={{ color: risk.color, backgroundColor: `${risk.bg}15` }}
            >
              {risk.label}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {indicators.map((indicator, index) => {
          const indicatorRisk = getRiskLevel((indicator.score / indicator.maxScore) * 100);
          return (
            <div
              key={index}
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(64,53,44,0.04)', border: '1px solid rgba(64,53,44,0.08)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: '#40352C' }}>{indicator.factor}</span>
                <span className="text-xs font-semibold" style={{ color: indicatorRisk.color }}>
                  {indicator.score}/{indicator.maxScore}
                </span>
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(64,53,44,0.08)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${(indicator.score / indicator.maxScore) * 100}%`, backgroundColor: indicatorRisk.bg }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgba(64,53,44,0.5)' }}>{indicator.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.04)', border: '1px solid rgba(64,53,44,0.12)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Lightbulb" size={16} style={{ color: '#40352C' }} />
          <span className="text-sm font-medium" style={{ color: '#40352C' }}>Veterinarian Recommendation</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(64,53,44,0.55)' }}>
          Based on current indicators, continue monitoring every 30 minutes. Ensure horse has access to fresh water and monitor for any pawing or rolling behavior.
        </p>
      </div>
    </div>
  );
};

export default ColicRiskAssessment;
