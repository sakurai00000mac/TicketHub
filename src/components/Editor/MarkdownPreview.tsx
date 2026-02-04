import type { ComponentPropsWithoutRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWikiStore } from '../../stores/wikiStore';
import { resolveWikiLinks } from '../../utils/markdown';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { pages } = useWikiStore();

  const resolved = projectId
    ? resolveWikiLinks(content, pages, projectId)
    : content;

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
            if (href?.startsWith('wiki-page/')) {
              const pageId = href.slice('wiki-page/'.length);
              return (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (projectId) navigate(`/projects/${projectId}/wiki/${pageId}`);
                  }}
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return <a href={href} {...props}>{children}</a>;
          },
        }}
      >
        {resolved}
      </ReactMarkdown>
    </div>
  );
}
