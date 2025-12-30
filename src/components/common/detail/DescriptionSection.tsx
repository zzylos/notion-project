import React from 'react';

interface DescriptionSectionProps {
  description: string;
}

/**
 * Displays the description of a work item.
 */
const DescriptionSection: React.FC<DescriptionSectionProps> = ({ description }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Description
    </label>
    <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
  </div>
);

DescriptionSection.displayName = 'DescriptionSection';

export default DescriptionSection;
