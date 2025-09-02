
import { Star, StarHalf, StarOff } from 'lucide-react';

interface ReputationStarsProps {
  reputation: number;
  className?: string;
}

export function ReputationStars({ reputation, className = '' }: ReputationStarsProps) {
  const renderReputationStars = (reputation: number) => {
    const stars = [];
    const fullStars = Math.floor(reputation);
    const hasHalfStar = reputation % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 text-yellow-500" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarHalf key={i} className="h-4 w-4 text-yellow-500" />);
      } else {
        stars.push(<StarOff key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    
    return stars;
  };

  return (
    <div className={`flex space-x-0.5 ${className}`}>
      {renderReputationStars(reputation)}
    </div>
  );
}
