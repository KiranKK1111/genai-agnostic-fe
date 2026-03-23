import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Typography,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  isMobile?: boolean;
  compact?: boolean;
}

export function autoCloseMarkdown(text: string): string {
  let result = text;

  // Close unclosed fenced code blocks
  const fences = result.match(/```/g);
  if (fences && fences.length % 2 !== 0) result += '\n```';

  // Close unclosed inline code (only if not inside a fenced block)
  const backticks = result.match(/(?<!`)`(?!`)/g);
  if (backticks && backticks.length % 2 !== 0) result += '`';

  // Close unclosed bold
  const bolds = result.match(/\*\*/g);
  if (bolds && bolds.length % 2 !== 0) result += '**';

  // Close unclosed italic (single * not part of **)
  const italics = (result.match(/(?<!\*)\*(?!\*)/g) || []);
  if (italics.length % 2 !== 0) result += '*';

  return result;
}

const InlineCode = styled('code')(({ theme }) => ({
  display: 'inline',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  color: theme.palette.mode === 'dark' ? '#e879f9' : '#9333ea',
  padding: '1px 5px',
  borderRadius: '3px',
  fontSize: '0.85em',
  fontFamily: '"Courier New", monospace',
}));

export function MarkdownRenderer({ content, isMobile = false, compact = false }: MarkdownRendererProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <ReactMarkdown
      components={{
        // In react-markdown v8+, fenced code blocks render as <pre><code>.
        // We handle all styling in the code renderer, so strip the <pre> wrapper.
        pre: ({ children }) => <>{children}</>,

        // Headings
        h1: ({ node, ...props }) => (
          <Typography
            variant="h4"
            sx={{
              mt: 2,
              mb: 1,
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#1a1a1a',
            }}
            {...props}
          />
        ),
        h2: ({ node, ...props }) => (
          <Typography
            variant="h5"
            sx={{
              mt: 1.5,
              mb: 0.8,
              fontWeight: 600,
              color: isDark ? '#ffffff' : '#1a1a1a',
            }}
            {...props}
          />
        ),
        h3: ({ node, ...props }) => (
          <Typography
            variant="h6"
            sx={{
              mt: 1,
              mb: 0.5,
              fontWeight: 600,
              color: isDark ? '#ffffff' : '#1a1a1a',
            }}
            {...props}
          />
        ),

        // Paragraphs
        p: ({ node, ...props }) => (
          <Typography
            variant="body2"
            component={compact ? 'span' : 'p'}
            sx={{
              mb: compact ? 0 : 1,
              display: compact ? 'inline' : undefined,
              lineHeight: 1.6,
              color: isDark ? '#e0e0e0' : '#333333',
              fontSize: isMobile ? '13px' : '14px',
            }}
            {...props}
          />
        ),

        // Lists
        ul: ({ node, ...props }) => (
          <Box
            component="ul"
            sx={{
              mb: 1,
              pl: 2,
              '& li': {
                lineHeight: 1.65,
                fontSize: isMobile ? '13px' : '14px',
              },
              // Collapse block-level <p> wrappers inside list items to inline
              '& li > p': { display: 'inline', margin: 0 },
              '& li > p + p::before': { content: '" "' },
            }}
            {...props}
          />
        ),
        ol: ({ node, ...props }) => (
          <Box
            component="ol"
            sx={{
              mb: 1,
              pl: 2,
              color: isDark ? '#e0e0e0' : '#333333',
              '& li': {
                mb: 0.5,
                lineHeight: 1.65,
                fontSize: isMobile ? '13px' : '14px',
              },
              // Collapse block-level <p> wrappers inside list items to inline
              '& li > p': { display: 'inline', margin: 0 },
              '& li > p + p::before': { content: '" "' },
            }}
            {...props}
          />
        ),

        // Bold and Italic
        strong: ({ node, ...props }) => (
          <Typography
            component="strong"
            sx={{ fontWeight: 700, color: isDark ? '#ffffff' : '#1a1a1a' }}
            {...props}
          />
        ),
        em: ({ node, ...props }) => (
          <Typography
            component="em"
            sx={{ fontStyle: 'italic', color: isDark ? '#e0e0e0' : '#333333' }}
            {...props}
          />
        ),

        code: ({ node, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const isBlock = !!match || String(children).includes('\n');

          if (isBlock) {
            const language = match ? match[1] : 'text';
            return (
              <Box
                sx={{
                  my: 1,
                  borderRadius: 1,
                  overflow: 'auto',
                  backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
                  border: `1px solid ${isDark ? '#333333' : '#e0e0e0'}`,
                }}
              >
                <SyntaxHighlighter
                  language={language}
                  style={isDark ? darcula : vs}
                  customStyle={{
                    margin: 0,
                    padding: '12px',
                    fontSize: '12px',
                    lineHeight: '1.4',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </Box>
            );
          }

          // Inline code - single-line backtick span
          return <InlineCode>{children}</InlineCode>;
        },

        // Links
        a: ({ node, ...props }) => (
          <Typography
            component="a"
            sx={{
              color: '#3b82f6',
              textDecoration: 'underline',
              cursor: 'pointer',
              '&:hover': {
                color: '#2563eb',
              },
            }}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),

        // Blockquotes
        blockquote: ({ node, ...props }: any) => (
          <Box
            sx={{
              pl: 2,
              py: 1,
              pr: 2,
              my: 1,
              borderLeft: `4px solid ${isDark ? '#3b82f6' : '#2563eb'}`,
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
              fontStyle: 'italic',
              color: isDark ? '#b3d9ff' : '#1e40af',
            }}
            {...props}
          />
        ),

        // Tables
        table: ({ node, ...props }) => (
          <Box
            sx={{
              overflowX: 'auto',
              my: 1,
              borderRadius: 1,
              border: `1px solid ${isDark ? '#333333' : '#e0e0e0'}`,
            }}
          >
            <Table
              sx={{
                minWidth: 300,
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              }}
            >
              {props.children}
            </Table>
          </Box>
        ),
        thead: ({ node, ...props }) => (
          <TableHead sx={{ backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }} {...props} />
        ),
        tbody: ({ node, ...props }) => <TableBody {...props} />,
        tr: ({ node, ...props }) => (
          <TableRow sx={{ borderBottom: `1px solid ${isDark ? '#333333' : '#e0e0e0'}` }} {...props} />
        ),
        th: ({ node, align, ...props }: any) => (
          <TableCell
            sx={{
              fontWeight: 700,
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              color: isDark ? '#ffffff' : '#1a1a1a',
              borderBottom: `2px solid ${isDark ? '#444444' : '#d0d0d0'}`,
              padding: '12px 8px',
              textAlign: align && ['left', 'center', 'right'].includes(align) ? (align as 'left' | 'center' | 'right') : 'left',
            }}
            {...props}
          />
        ),
        td: ({ node, align, ...props }: any) => (
          <TableCell
            sx={{
              color: isDark ? '#e0e0e0' : '#333333',
              padding: '10px 8px',
              fontSize: isMobile ? '12px' : '13px',
              textAlign: align && ['left', 'center', 'right'].includes(align) ? (align as 'left' | 'center' | 'right') : 'left',
            }}
            {...props}
          />
        ),

        // Horizontal rule
        hr: ({ node, ...props }) => (
          <Box
            sx={{
              my: 2,
              height: '1px',
              backgroundColor: isDark ? '#333333' : '#e0e0e0',
            }}
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}