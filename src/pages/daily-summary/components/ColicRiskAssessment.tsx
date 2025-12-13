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
    if (score <= 30) return { label: 'Low Risk', color: 'text-[#4a9d6b]', bg: 'bg-[#4a9d6b]' };
    if (score <= 60) return { label: 'Moderate Risk', color: 'text-[#d4a84b]', bg: 'bg-[#d4a84b]' };
    return { label: 'High Risk', color: 'text-[#c75050]', bg: 'bg-[#c75050]' };
  };

  const risk = getRiskLevel(overallScore);

  return (
    <div className="glass-card p-6 luxury-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#c9a962]/10">
            <Icon name="Shield" size={20} className="text-[#c9a962]" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-[#faf9f6]">Colic Risk Assessment</h3>
            <p className="text-sm text-[#6b6b6b]">AI-powered early warning system</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(201,169,98,0.1)" strokeWidth="8" />
            <circle 
              cx="50" 
              cy="50" 
              r="42" 
              fill="none" 
              stroke={overallScore <= 30 ? '#4a9d6b' : overallScore <= 60 ? '#d4a84b' : '#c75050'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${overallScore * 2.64} 264`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-light ${risk.color}`}>{overallScore}</span>
            <span className="text-sm text-[#6b6b6b]">/ 100</span>
            <span className={`text-xs font-semibold mt-2 px-3 py-1 rounded-full ${risk.bg}/20 ${risk.color}`}>
              {risk.label}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {indicators.map((indicator, index) => {
          const indicatorRisk = getRiskLevel((indicator.score / indicator.maxScore) * 100);
          return (
            <div key={index} className="p-3 rounded-xl bg-white/[0.02] border border-[#c9a962]/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#faf9f6]">{indicator.factor}</span>
                <span className={`text-xs font-semibold ${indicatorRisk.color}`}>
                  {indicator.score}/{indicator.maxScore}
                </span>
              </div>
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${indicatorRisk.bg}`}
                  style={{ width: `${(indicator.score / indicator.maxScore) * 100}%` }}
                />
              </div>
              <p className="text-xs text-[#6b6b6b] mt-2">{indicator.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-[#c9a962]/5 border border-[#c9a962]/20">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Lightbulb" size={16} className="text-[#c9a962]" />
          <span className="text-sm font-medium text-[#c9a962]">Veterinarian Recommendation</span>
        </div>
        <p className="text-xs text-[#a8a8a8] leading-relaxed">
          Based on current indicators, continue monitoring every 30 minutes. Ensure horse has access to fresh water and monitor for any pawing or rolling behavior.
        </p>
      </div>
    </div>
  );
};

export default ColicRiskAssessment;
