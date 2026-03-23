import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { MarkdownRenderer } from './MarkdownRenderer';
import { VisualizationRouter } from './visualizations/VisualizationRouter';
import { ArtifactRenderer } from './ArtifactRenderer';
import type { Visualization, RenderArtifact, DataPayload } from '../api';

/**
 * Renders a single list-item string inline - no block wrappers.
 * Handles code, *bold, *italic spans without using ReactMarkdown.
 */
function InlineItem({ text, isDark, isMobile }: { text: string; isDark: boolean; isMobile?: boolean }) {
  // Collapse newlines/double-spaces so field\n: desc stays on one line
  const flat = text.replace(/\s*\n+\s*/g, ' ').trim();

  // Tokenize: split by code, *bold, *italic
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(flat)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{flat.slice(last, m.index)}</span>);
    const tok = m[0];
    if (tok.startsWith('`')) {
      parts.push(
        <Box
          key={key++}
          component="code"
          sx={{
            fontSize: '12px',
            fontFamily: "'Courier New', monospace",
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            borderRadius: '3px',
            padding: '1px 5px',
            color: isDark ? '#e879f9' : '#9333ea',
          }}
        >
          {tok.slice(1, -1)}
        </Box>
      );
    } else if (tok.startsWith('**')) {
      parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < flat.length) parts.push(<span key={key++}>{flat.slice(last)}</span>);

  return (
    <Typography
      component="span"
      sx={{
        fontSize: isMobile ? '13px' : '14px',
        lineHeight: 1.65,
        color: isDark ? '#e0e0e0' : '#333333',
      }}
    >
      {parts}
    </Typography>
  );
}

interface ContentBlock {
  type: 'paragraph' | 'table' | 'bullets' | 'numbered' | 'callout' | 'code';
  text?: string;
  items?: string[];
  emoji?: string;
  variant?: string;
  headers?: string[];
  rows?: (string | number)[][];
  language?: string;
}

interface ResponseBeautifierProps {
  content: ContentBlock[];
  isMobile: boolean;
  selectedVizType?: string;
  response: any; // Full response object with visualizations data
  /** Artifact-centric render artifacts (ResponseGeneration.md) */
  renderArtifacts?: RenderArtifact[];
  /** Structured data payload for chart artifacts */
  dataPayload?: DataPayload | null;
  /** During typewriter animation - partially-revealed text to display for text blocks. */
  typedContent?: string;
  /** False while typewriter is still animating. */
  typingDone?: boolean;
}

const CalloutBox = styled(Paper)(({ theme }) => ({
  padding: '12px 16px',
  marginBottom: '12px',
  borderLeft: '4px solid #3b82f6',
  borderRadius: '4px',
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(59, 130, 246, 0.1)' 
    : 'rgba(59, 130, 246, 0.05)',
  '&.warning': {
    borderLeftColor: '#f59e0b',
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.1)'
      : 'rgba(245, 158, 11, 0.05)',
  },
  '&.success': {
    borderLeftColor: '#10b981',
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.1)'
      : 'rgba(16, 185, 129, 0.05)',
  },
}));

const BulletList = styled(Box)(({ theme }) => ({
  '& li': {
    marginBottom: '4px',
    lineHeight: 1.6,
    fontSize: '14px',
    color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#333333',
  },
}));

export function ResponseBeautifier({
  content,
  isMobile = false,
  selectedVizType,
  response,
  renderArtifacts,
  dataPayload,
  typedContent,
  typingDone = true,
}: ResponseBeautifierProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const renderContent = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <Typography
            key={index}
            variant="body2"
            sx={{
              mb: 1,
              lineHeight: 1.6,
              color: isDark ? '#e0e0e0' : '#333333',
              fontSize: isMobile ? '13px' : '14px',
            }}
          >
            {block.text}
          </Typography>
        );

      case 'table':
        // Convert headers and rows to array of objects
        let tableData: Record<string, any>[] = [];
        if (block.rows && block.headers) {
          tableData = block.rows.map((row) => {
            const obj: Record<string, any> = {};
            block.headers?.forEach((header, idx) => {
              obj[header] = row[idx];
            });
            return obj;
          });
        }

        const tableVisualization: Visualization = {
          chart_id: `table-${index}`,
          type: 'table',
          title: 'Data Table',
          data: tableData,
          config: { available_views: ['table'] },
        };

        return (
          <Box key={index} sx={{ mb: 2 }}>
            <VisualizationRouter 
              visualization={tableVisualization} 
              selectedType={selectedVizType} 
            />
          </Box>
        );

      case 'bullets':
        return (
          <Box key={index} sx={{ mb: 1.5 }}>
            <Box component="ul" sx={{ pl: 3, '& li': { marginBottom: '4px', lineHeight: 1.65 } }}>
              {block.items?.map((item, idx) => (
                <Box component="li" key={idx}>
                  <InlineItem text={item} isDark={isDark} isMobile={isMobile} />
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'numbered':
        return (
          <Box key={index} sx={{ mb: 1.5 }}>
            <Box component="ol" sx={{ pl: 3, listStyleType: 'decimal', '& li': { marginBottom: '4px', lineHeight: 1.65 } }}>
              {block.items?.map((item, idx) => (
                <Box component="li" key={idx}>
                  <InlineItem text={item} isDark={isDark} isMobile={isMobile} />
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'callout':
        const calloutClass = block.variant === 'warning' ? 'warning' : block.variant === 'success' ? 'success' : '';
        return (
          <CalloutBox key={index} elevation={0} className={calloutClass}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ 
                fontSize: isMobile ? '12px' : '13px', 
                lineHeight: 1.5, 
                color: isDark ? '#c7d2fe' : '#374151',
                flex: 1 
              }}>
                {block.text}
              </Typography>
            </Box>
          </CalloutBox>
        );

      case 'code':
        return (
          <Box
            key={index}
            sx={{
              mb: 1.5,
              backgroundColor: isDark ? '#1a202c' : '#f7f7f7',
              padding: '12px',
              borderRadius: '6px',
              overflowX: 'auto',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
            }}
          >
            <Typography
              component="code"
              sx={{
                fontSize: '12px',
                fontFamily: "'Courier New', monospace",
                color: isDark ? '#4aa6ff' : '#c41e50',
                lineHeight: 1.5,
              }}
            >
              {block.text}
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  const hasArtifacts = renderArtifacts && renderArtifacts.length > 0;

  return (
    <Box sx={{ width: '100%' }}>
      {/* During typewriter animation: show animated text above, render visual blocks immediately */}
      {!typingDone && typedContent !== undefined ? (
        <>
          {/* Animated text portion */}
          <Box sx={{ position: 'relative' }}>
            <MarkdownRenderer
              content={typedContent}
              isMobile={isMobile}
            />
            {/* Blinking cursor */}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: '2px',
                height: '1em',
                backgroundColor: '#3b82f6',
                ml: '1px',
                verticalAlign: 'text-bottom',
                animation: 'twCursor 0.7s step-end infinite',
                '@keyframes twCursor': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0 },
                },
              }}
            />
          </Box>
          {/* Non-text blocks (tables, charts, code) render immediately */}
          {!hasArtifacts && content
            .filter((b) => b.type === 'table' || b.type === 'code')
            .map((block, index) => renderContent(block, index))}
          {/* Artifact-centric blocks always render immediately */}
          {hasArtifacts && (
            <ArtifactRenderer artifacts={renderArtifacts} dataPayload={dataPayload} />
          )}
        </>
      ) : (
        <>
          {/* When artifacts present, skip legacy table/chart content blocks (artifacts replace them) */}
          {(hasArtifacts
            ? content.filter((b) => b.type !== 'table')
            : content
          ).map((block, index) => renderContent(block, index))}
          {hasArtifacts && (
            <ArtifactRenderer artifacts={renderArtifacts} dataPayload={dataPayload} />
          )}
        </>
      )}
    </Box>
  );
}