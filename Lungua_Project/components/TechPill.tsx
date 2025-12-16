
import React from 'react';

interface TechPillProps {
  name: string;
}

export const TechPill: React.FC<TechPillProps> = ({ name }) => {
  return (
    <div className="bg-blue-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-full shadow-sm">
      {name}
    </div>
  );
};
