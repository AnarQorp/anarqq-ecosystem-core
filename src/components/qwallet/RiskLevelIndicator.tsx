/**
 * Risk Level Visual Indicator Component
 * Displays wallet security risk levels with color-coded indicators,
 * risk factors, and mitigation recommendations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Activity,
  Clock,
  Zap,
  Target,
  Info,
  RefreshCw
} from 'lucide-react';

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number; // 0-1
  category: 'VELOCITY' | 'AMOUNT' | 'FREQUENCY' | 'PATTERN' | 'DEVICE' | 'LOCATION';
  detected: string;
  lastOccurrence: string;
  occurrenceCount: number;
}

export interface RiskAssessment {
  identityId: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number; // 0-1
  factors: RiskFactor[];
  recommendations: string[];
  lastAssessment: string;
  nextAssessment: string;
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  reputationScore?: number;
  reputationTier?: 'TRUSTED' | 'NEUTRAL' | 'RESTRICTED';
}

export interface RiskLevelIndicatorProps {
  riskAssessment: RiskAssessment;
  compact?: boolean;
  showFactors?: boolean;
  showRecommendations?: boolean;
  showTrend?: boolean;
  onRefresh?: () => void;
  onFactorClick?: (factor: RiskFactor) => void;
  className?: string;
}

interface RiskMeterProps {
  riskScore: number;
  riskLevel: string;
  size?: 'small' | 'medium' | 'large';
  showScore?: boolean;
}

const RiskMeter: React.FC<RiskMeterProps> = ({
  riskScore,
  riskLevel,
  size = 'medium',
  showScore = true
}) => {
  const percentage = riskScore * 100;
  
  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'w-16 h-16';
      case 'large': return 'w-24 h-24';
      default: return 'w-20 h-20';
    }
  };
  
  const getStrokeWidth = () => {
    switch (size) {
      case 'small': return 4;
      case 'large': return 6;
      default: return 5;
    }
  };
  
  const getColor = () => {
    switch (riskLevel) {
      case 'LOW': return '#10b981'; // green
      case 'MEDIUM': return '#f59e0b'; // yellow
      case 'HIGH': return '#f97316'; // orange
      case 'CRITICAL': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };
  
  const radius = size === 'small' ? 28 : size === 'large' ? 42 : 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={`relative ${getSizeClasses()}`}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={getStrokeWidth()}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke={getColor()}
          strokeWidth={getStrokeWidth()}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {showScore && (
            <div className={`font-bold ${
              size === 'small' ? 'text-xs' : size === 'large' ? 'text-lg' : 'text-sm'
            }`} style={{ color: getColor() }}>
              {Math.round(percentage)}%
            </div>
          )}
          <div className={`text-gray-500 ${
            size === 'small' ? 'text-xs' : 'text-xs'
          }`}>
            {riskLevel}
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskFactorItem: React.FC<{
  factor: RiskFactor;
  onClick?: () => void;
  compact?: boolean;
}> = ({ factor, onClick, compact = false }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'VELOCITY': return <TrendingUp className="w-3 h-3" />;
      case 'AMOUNT': return <Target className="w-3 h-3" />;
      case 'FREQUENCY': return <Activity className="w-3 h-3" />;
      case 'PATTERN': return <Zap className="w-3 h-3" />;
      case 'DEVICE': return <Shield className="w-3 h-3" />;
      case 'LOCATION': return <Clock className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };
  
  if (compact) {
    return (
      <div 
        className={`flex items-center justify-between p-2 rounded border ${
          onClick ? 'cursor-pointer hover:bg-gray-50' : ''
        }`}
        onClick={onClick}
      >
        <div className="flex items-center space-x-2">
          <div className="text-gray-500">{getCategoryIcon(factor.category)}</div>
          <span className="text-sm font-medium">{factor.name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`text-xs ${getSeverityColor(factor.severity)}`}>
            {factor.severity}
          </Badge>
          <span className="text-xs text-gray-500">
            {Math.round(factor.score * 100)}%
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`p-3 rounded-lg border ${getSeverityColor(factor.severity)} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <div className="mt-1">{getCategoryIcon(factor.category)}</div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{factor.name}</span>
              <Badge variant="outline" className="text-xs">
                {factor.category}
              </Badge>
            </div>
            <p className="text-sm mt-1">{factor.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
              <span>Score: {Math.round(factor.score * 100)}%</span>
              <span>Count: {factor.occurrenceCount}</span>
              <span>Last: {new Date(factor.lastOccurrence).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <Badge className={`${getSeverityColor(factor.severity)}`}>
          {factor.severity}
        </Badge>
      </div>
    </div>
  );
};

export const RiskLevelIndicator: React.FC<RiskLevelIndicatorProps> = ({
  riskAssessment,
  compact = false,
  showFactors = true,
  showRecommendations = true,
  showTrend = true,
  onRefresh,
  onFactorClick,
  className = ''
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const getTrendIcon = () => {
    switch (riskAssessment.trend) {
      case 'IMPROVING': return <TrendingDown className="w-4 h-4 text-green-600" />;
      case 'WORSENING': return <TrendingUp className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };
  
  const getTrendColor = () => {
    switch (riskAssessment.trend) {
      case 'IMPROVING': return 'text-green-600';
      case 'WORSENING': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getOverallStatusIcon = () => {
    switch (riskAssessment.overallRisk) {
      case 'LOW': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'MEDIUM': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'HIGH': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'CRITICAL': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  // Sort factors by severity and score
  const sortedFactors = [...riskAssessment.factors].sort((a, b) => {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.score - a.score;
  });
  
  if (compact) {
    return (
      <Card className={`risk-level-indicator-compact ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RiskMeter 
                riskScore={riskAssessment.riskScore}
                riskLevel={riskAssessment.overallRisk}
                size="small"
              />
              <div>
                <div className="font-medium">{riskAssessment.overallRisk} Risk</div>
                {showTrend && (
                  <div className={`flex items-center space-x-1 text-xs ${getTrendColor()}`}>
                    {getTrendIcon()}
                    <span>{riskAssessment.trend}</span>
                  </div>
                )}
              </div>
            </div>
            
            {riskAssessment.reputationScore && (
              <div className="text-right">
                <div className="text-sm font-medium">
                  {riskAssessment.reputationScore}/1000
                </div>
                <div className="text-xs text-gray-500">
                  {riskAssessment.reputationTier}
                </div>
              </div>
            )}
          </div>
          
          {sortedFactors.length > 0 && (
            <div className="mt-3 space-y-1">
              {sortedFactors.slice(0, 2).map((factor) => (
                <RiskFactorItem
                  key={factor.id}
                  factor={factor}
                  compact={true}
                  onClick={() => onFactorClick?.(factor)}
                />
              ))}
              {sortedFactors.length > 2 && (
                <div className="text-center">
                  <Button variant="ghost" size="sm" className="text-xs">
                    +{sortedFactors.length - 2} more factors
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`risk-level-indicator ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {getOverallStatusIcon()}
            <span>Risk Assessment</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {showTrend && (
              <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-sm">{riskAssessment.trend}</span>
              </div>
            )}
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Risk Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <RiskMeter 
              riskScore={riskAssessment.riskScore}
              riskLevel={riskAssessment.overallRisk}
              size="medium"
            />
            <div>
              <div className="text-2xl font-bold">{riskAssessment.overallRisk}</div>
              <div className="text-sm text-gray-600">Overall Risk Level</div>
              <div className="text-xs text-gray-500 mt-1">
                Score: {Math.round(riskAssessment.riskScore * 100)}/100
              </div>
            </div>
          </div>
          
          {riskAssessment.reputationScore && (
            <div className="text-right">
              <div className="text-lg font-bold">
                {riskAssessment.reputationScore}/1000
              </div>
              <div className="text-sm text-gray-600">Reputation Score</div>
              <Badge variant="outline" className="text-xs mt-1">
                {riskAssessment.reputationTier}
              </Badge>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Risk Factors */}
        {showFactors && sortedFactors.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Risk Factors ({sortedFactors.length})</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('factors')}
              >
                {expandedSection === 'factors' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            
            {(expandedSection === 'factors' || sortedFactors.length <= 3) && (
              <div className="space-y-3">
                {sortedFactors.map((factor) => (
                  <RiskFactorItem
                    key={factor.id}
                    factor={factor}
                    onClick={() => onFactorClick?.(factor)}
                  />
                ))}
              </div>
            )}
            
            {expandedSection !== 'factors' && sortedFactors.length > 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedFactors.slice(0, 4).map((factor) => (
                  <RiskFactorItem
                    key={factor.id}
                    factor={factor}
                    compact={true}
                    onClick={() => onFactorClick?.(factor)}
                  />
                ))}
                {sortedFactors.length > 4 && (
                  <div className="col-span-full text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSection('factors')}
                    >
                      View all {sortedFactors.length} factors
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Recommendations */}
        {showRecommendations && riskAssessment.recommendations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Security Recommendations</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection('recommendations')}
                >
                  {expandedSection === 'recommendations' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              
              {(expandedSection === 'recommendations' || riskAssessment.recommendations.length <= 2) && (
                <div className="space-y-3">
                  {riskAssessment.recommendations.map((recommendation, index) => (
                    <Alert key={index}>
                      <Info className="h-4 w-4" />
                      <AlertDescription>{recommendation}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
              
              {expandedSection !== 'recommendations' && riskAssessment.recommendations.length > 2 && (
                <div className="space-y-2">
                  {riskAssessment.recommendations.slice(0, 2).map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <Info className="w-4 h-4 mt-0.5 text-blue-600" />
                      <span>{recommendation}</span>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleSection('recommendations')}
                    className="w-full"
                  >
                    View all {riskAssessment.recommendations.length} recommendations
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Assessment Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 mt-0.5 text-gray-600" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Assessment Information</p>
              <div className="space-y-1 text-xs">
                <p>Last assessed: {new Date(riskAssessment.lastAssessment).toLocaleString()}</p>
                <p>Next assessment: {new Date(riskAssessment.nextAssessment).toLocaleString()}</p>
                <p>Risk factors are continuously monitored and updated in real-time.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskLevelIndicator;