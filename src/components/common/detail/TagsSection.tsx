import React from 'react';
import { Tag } from 'lucide-react';

interface TagsSectionProps {
  tags: string[];
}

/**
 * Displays a list of tags for a work item.
 */
const TagsSection: React.FC<TagsSectionProps> = ({ tags }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</label>
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
        >
          <Tag className="w-3 h-3" />
          {tag}
        </span>
      ))}
    </div>
  </div>
);

TagsSection.displayName = 'TagsSection';

export default TagsSection;
