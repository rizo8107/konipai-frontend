import React from "react";
import { cn } from "@/lib/utils";
import { Star, StarHalf } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  className?: string;
  readOnly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  max = 5,
  size = 24,
  className,
  readOnly = false,
}) => {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  const handleClick = (rating: number) => {
    if (readOnly) return;
    if (onChange) onChange(rating);
  };

  return (
    <div className={cn("flex items-center", className)}>
      {stars.map((star) => {
        const filled = star <= Math.floor(value);
        const half = !filled && star <= value + 0.5;

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            className={cn(
              "focus:outline-none transition-colors",
              readOnly ? "cursor-default" : "cursor-pointer hover:text-yellow-500",
              filled ? "text-yellow-500" : "text-gray-300"
            )}
            disabled={readOnly}
            aria-label={`Rate ${star} out of ${max} stars`}
          >
            {half ? (
              <StarHalf size={size} className="text-yellow-500" />
            ) : (
              <Star size={size} />
            )}
          </button>
        );
      })}
    </div>
  );
}; 