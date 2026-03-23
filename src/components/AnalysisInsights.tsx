/**
 * Analysis Insights Component
 * Displays confidence scores, risk assessment, warnings, and improvements
 */

import React from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  LinearProgress,
  Collapse,
  useTheme,
} from '@mui/material';
import {
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Lightbulb,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import type { ConfidenceLevel, IntelligentModalResponse } from '../api';

interface AnalysisInsightsProps {
  response: IntelligentModalResponse;
  expanded?: boolean;
}

const confidenceColors: Record<ConfidenceLevel, string> = {
  'VERY_CONFIDENT': '#10b981',  // green
  'CONFIDENT': '#3b82f6',        // blue
  'MODERATE': '#f59e0b',         // amber
  'LOW': '#ef4444',              // red
  'VERY_LOW': '#991b1b',         // dark red
};

const confidenceEmojis: Record<ConfidenceLevel, string> = {
  'VERY_CONFIDENT': '🟢',
  'CONFIDENT': '🟢',
  'MODERATE': '🟡',
  'LOW': '🟠',
  'VERY_LOW': '🔴',
};

const riskColors: Record<string, string> = {
  'LOW': '#10b981',
  'MEDIUM': '#f59e0b',
  'HIGH': '#ef4444',
  'CRITICAL': '#991b1b',
};

export function AnalysisInsights({
  response,
  expanded = false,
}: AnalysisInsightsProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = React.useState(expanded);

  const riskLevel = response.risk_score >= 0.8 ? 'CRITICAL'
    : response.risk_score >= 0.6 ? 'HIGH'
    : response.risk_score >= 0.4 ? 'MEDIUM'
    : 'LOW';

  const warnings = response.warnings || response.metadata?.warnings || [];
  const improvements = response.improvements || response.metadata?.improvements || [];

  return (
    <Card
      onClick={() => setIsOpen(!isOpen)}
      sx={{
        cursor: 'pointer',
        mb: 2,
        background: `linear-gradient(135deg, ${confidenceColors[response.confidence_level]}15 0%, transparent 100%)`,
        borderLeft: `4px solid ${confidenceColors[response.confidence_level]}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
      }}
    >
      {/* Header with confidence and risk scores */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Zap size={18} color={confidenceColors[response.confidence_level]} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {confidenceEmojis[response.confidence_level]} {response.confidence_level}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Risk: {(response.risk_score * 100).toFixed(0)}%
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 24,
                bgcolor: riskColors[riskLevel],
                borderRadius: 1,
                opacity: 0.7,
              }}
            />
          </Box>
        </Box>

        {/* Confidence Progress Bar */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Confidence Score
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: confidenceColors[response.confidence_level] }}
            >
              {(response.confidence_score * 100).toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={response.confidence_score * 100}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: `${confidenceColors[response.confidence_level]}22`,
              '& .MuiLinearProgress-bar': {
                backgroundColor: confidenceColors[response.confidence_level],
                borderRadius: 2,
              },
            }}
          />
        </Box>

        {/* Risk Progress Bar */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Risk Assessment
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: riskColors[riskLevel] }}>
              {riskLevel}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={response.risk_score * 100}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: `${riskColors[riskLevel]}22`,
              '& .MuiLinearProgress-bar': {
                backgroundColor: riskColors[riskLevel],
                borderRadius: 2,
              },
            }}
          />
        </Box>
      </Box>

      {/* Expandable Details */}
      <Collapse in={isOpen}>
        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          {/* Warnings */}
          {warnings.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AlertCircle size={16} color="#ef4444" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Warnings ({warnings.length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {warnings.map((warning: string, idx: number) => (
                  <Chip
                    key={idx}
                    icon={<AlertTriangle size={14} />}
                    label={warning}
                    size="small"
                    variant="outlined"
                    sx={{
                      backgroundColor: '#fee2e2',
                      borderColor: '#fca5a5',
                      color: '#991b1b',
                      fontSize: '12px',
                      '& .MuiChip-icon': {
                        color: '#ef4444',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Lightbulb size={16} color="#f59e0b" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Improvements ({improvements.length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {improvements.map((improvement: string, idx: number) => (
                  <Chip
                    key={idx}
                    icon={<TrendingUp size={14} />}
                    label={improvement}
                    size="small"
                    variant="outlined"
                    sx={{
                      backgroundColor: '#fef3c7',
                      borderColor: '#fcd34d',
                      color: '#78350f',
                      fontSize: '12px',
                      '& .MuiChip-icon': {
                        color: '#f59e0b',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Additional Analysis */}
          {response.metadata?.analysis && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                Analysis Details
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {response.metadata.analysis.semantic_score !== undefined && (
                  <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Semantic Score
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {(response.metadata.analysis.semantic_score * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                )}
                {response.metadata.analysis.pattern_match !== undefined && (
                  <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Pattern Match
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {(response.metadata.analysis.pattern_match * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                )}
                {response.metadata.execution_time_ms !== undefined && (
                  <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Execution Time
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {response.metadata.execution_time_ms}ms
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Card>
  );
}
