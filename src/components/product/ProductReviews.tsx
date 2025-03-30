import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';
import { PocketBaseService } from '@/lib/pocketbase';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProductReviewsProps {
  productId: string;
}

interface Review {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  title: string;
  content: string;
  images: string[];
  created: string;
  helpful_votes: number;
  verified_purchase: boolean;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // Fetch reviews when the component mounts
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const pb = new PocketBaseService();
        
        // Fetch reviews for this product
        const result = await pb.getList('reviews', 1, 50, `product = "${productId}"`, '-created');
        
        // Process the reviews
        const processedReviews = await Promise.all(
          result.items.map(async (item: any) => {
            let user = { id: '', name: 'Anonymous' };
            
            // Try to fetch user details
            if (item.user) {
              try {
                const userData = await pb.getOne('users', item.user);
                user = {
                  id: userData.id,
                  name: userData.name || userData.username || 'User',
                  avatar: userData.avatar ? pb.getFileUrl(userData, 'avatar') : undefined,
                };
              } catch (error) {
                console.error('Error fetching user:', error);
              }
            }
            
            // Process images
            const images = item.images && item.images.length > 0
              ? item.images.map((img: string) => pb.getFileUrl(item, img))
              : [];
            
            return {
              id: item.id,
              user,
              rating: item.rating || 0,
              title: item.title || '',
              content: item.content || '',
              images,
              created: item.created,
              helpful_votes: item.helpful_votes || 0,
              verified_purchase: item.verified_purchase || false,
            };
          })
        );
        
        setReviews(processedReviews);
        
        // Calculate average rating
        if (processedReviews.length > 0) {
          const sum = processedReviews.reduce((acc, review) => acc + review.rating, 0);
          setAverageRating(sum / processedReviews.length);
        }
        
        setTotalReviews(result.totalItems);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">Loading reviews...</div>
        </CardContent>
      </Card>
    );
  }

  // No reviews state
  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">No reviews yet for this product.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Product Reviews ({totalReviews})</span>
          <div className="flex items-center">
            <StarRating value={averageRating} readOnly size={20} />
            <span className="ml-2 text-sm font-normal">
              {averageRating.toFixed(1)} out of 5
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    {review.user.avatar && (
                      <AvatarImage src={review.user.avatar} alt={review.user.name} />
                    )}
                    <AvatarFallback>
                      {review.user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{review.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(review.created)}
                      {review.verified_purchase && (
                        <span className="ml-2 text-green-600">✓ Verified Purchase</span>
                      )}
                    </div>
                  </div>
                </div>
                <StarRating value={review.rating} readOnly size={16} />
              </div>
              
              {review.title && (
                <h4 className="font-semibold mb-1">{review.title}</h4>
              )}
              
              <p className="text-sm mb-3">{review.content}</p>
              
              {review.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {review.images.map((image, index) => (
                    <img 
                      key={index}
                      src={image} 
                      alt={`Review ${index + 1}`} 
                      className="rounded-md w-24 h-24 object-cover"
                    />
                  ))}
                </div>
              )}
              
              <div className="flex items-center mt-3 text-xs text-muted-foreground">
                <span>{review.helpful_votes} people found this helpful</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductReviews;
