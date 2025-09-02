
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { moduleInfo } from '@/utils/mockData';
import { ReactNode } from 'react';

interface ModuleCardProps {
  moduleId: string;
  isActive: boolean;
  showDescription?: boolean;
  className?: string;
  children?: ReactNode;
}

export function ModuleCard({ moduleId, isActive, showDescription = true, className = '', children }: ModuleCardProps) {
  const module = moduleInfo[moduleId as keyof typeof moduleInfo];
  
  if (!module) return null;
  
  return (
    <Card className={`overflow-hidden transition-all ${isActive ? 'border-2' : 'opacity-70 hover:opacity-100'} ${className}`}
      style={{ borderColor: isActive ? module.color : '' }}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg" style={{ color: module.color }}>
            {module.name}
          </CardTitle>
          <Badge variant={isActive ? "default" : "outline"}>
            v{module.version}
          </Badge>
        </div>
        {showDescription && (
          <CardDescription className="text-sm mt-1">
            {module.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        {children ? (
          children
        ) : (
          <div className="text-sm">
            <span className="font-medium">Status: </span>
            <span className={isActive ? "text-green-500" : "text-muted-foreground"}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        )}
        {module.dependencies.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Dependencies: {module.dependencies.join(', ')}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isActive ? (
          <Link 
            to={`/modules/${module.id}`}
            className="text-sm font-medium underline underline-offset-4"
            style={{ color: module.color }}
          >
            Access Module
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground italic">Coming Soon</span>
        )}
      </CardFooter>
    </Card>
  );
}
