import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

interface SafeHtmlProps {
  html?: string;
  markdown?: string;
  className?: string;
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({ html, markdown, className }) => {
  if (markdown !== undefined) {
    return (
      <div className={className}>
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
          {markdown}
        </ReactMarkdown>
      </div>
    );
  }

  const sanitized = DOMPurify.sanitize(html || '');
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
