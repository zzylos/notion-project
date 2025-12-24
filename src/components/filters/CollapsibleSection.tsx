import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = memo(
  ({ title, isOpen, onToggle, children, count }) => (
    <fieldset className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>{title}</span>
        {count !== undefined && count > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-medium">
            {count}
          </span>
        )}
      </button>
      {isOpen && children}
    </fieldset>
  )
);

CollapsibleSection.displayName = 'CollapsibleSection';

export default CollapsibleSection;
