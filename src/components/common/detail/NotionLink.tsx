import React from 'react';
import { ExternalLink } from 'lucide-react';

interface NotionLinkProps {
  url: string;
}

/**
 * Button to open the work item in Notion.
 */
const NotionLink: React.FC<NotionLinkProps> = ({ url }) => (
  <div className="p-4 border-t border-gray-200">
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
    >
      <ExternalLink className="w-4 h-4" />
      Open in Notion
    </a>
  </div>
);

NotionLink.displayName = 'NotionLink';

export default NotionLink;
