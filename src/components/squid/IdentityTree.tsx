
import { Identity } from '@/types';
import { IdentityCard } from './IdentityCard';

interface IdentityTreeProps {
  rootIdentity: Identity;
  subIdentities: Identity[];
  expandedNodes: Set<string>;
  onToggleNode: (id: string) => void;
}

export function IdentityTree({ 
  rootIdentity, 
  subIdentities,
  expandedNodes,
  onToggleNode
}: IdentityTreeProps) {
  // Group sub-identities by parent
  const childrenByParent = subIdentities.reduce((acc, identity) => {
    if (identity.parentId) {
      if (!acc[identity.parentId]) {
        acc[identity.parentId] = [];
      }
      acc[identity.parentId].push(identity);
    }
    return acc;
  }, {} as Record<string, Identity[]>);

  // Recursive function to render a node and its children
  const renderNode = (identity: Identity, depth = 0) => {
    const children = childrenByParent[identity.id] || [];
    const isExpanded = expandedNodes.has(identity.id);

    return (
      <div key={identity.id} className="space-y-2">
        <div className={`ml-${depth * 8}`}>
          <IdentityCard
            identity={identity}
            isExpanded={isExpanded}
            onToggle={() => onToggleNode(identity.id)}
            hasChildren={children.length > 0}
            depth={depth}
          />
        </div>
        
        {isExpanded && children.length > 0 && (
          <div className={`ml-${(depth + 1) * 8} space-y-2`}>
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderNode(rootIdentity)}
    </div>
  );
}
