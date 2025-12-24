import React from 'react';

interface Owner {
  id: string;
  name?: string;
  email?: string;
}

interface OwnerSectionProps {
  owner?: Owner;
}

const OwnerSection: React.FC<OwnerSectionProps> = ({ owner }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</label>
      {owner ? (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
            {owner.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{owner.name}</p>
            <p className="text-xs text-gray-500">{owner.email}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No owner assigned</p>
      )}
    </div>
  );
};

export default OwnerSection;
