import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { PocketBaseService } from '@/lib/pocketbase';
import { useEffect } from 'react';

interface FeedbackFormProps {
  token: string;
  onSubmitSuccess?: () => void;
}

interface FeedbackData {
  userId: string;
  productId: string;
  orderId: string;
  rating: number;
  title: string;
  content: string;
  images: File[];
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ token, onSubmitSuccess }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    userId: '',
    productId: '',
    orderId: '',
    rating: 5,
    title: '',
    content: '',
    images: [],
  });
  const [productDetails, setProductDetails] = useState<{
    name: string;
    image: string;
  } | null>(null);

  // Parse token and load product details
  useEffect(() => {
    const parseToken = async () => {
      try {
        // Decode the token
        const decoded = decodeToken(token);
        if (!decoded) {
          setError('Invalid feedback link. Please contact customer support.');
          return;
        }

        // Update feedback data with token information
        setFeedbackData(prev => ({
          ...prev,
          userId: decoded.userId,
          productId: decoded.productId,
          orderId: decoded.orderId,
        }));

        // Load product details
        await loadProductDetails(decoded.productId);
      } catch (err) {
        console.error('Error parsing feedback token:', err);
        setError('Unable to load feedback form. Please try again later.');
      }
    };

    parseToken();
  }, [token]);

  const decodeToken = (token: string): { userId: string; productId: string; orderId: string } | null => {
    try {
      // Base64 decode and parse the token
      const decodedString = atob(token);
      const decodedData = JSON.parse(decodedString);
      
      // Validate the required fields
      if (!decodedData.userId || !decodedData.productId || !decodedData.orderId) {
        return null;
      }
      
      return {
        userId: decodedData.userId,
        productId: decodedData.productId,
        orderId: decodedData.orderId,
      };
    } catch (err) {
      console.error('Token decode error:', err);
      return null;
    }
  };

  const loadProductDetails = async (productId: string) => {
    try {
      const pb = new PocketBaseService();
      const product = await pb.getOne('products', productId);
      
      if (product) {
        setProductDetails({
          name: product.name,
          image: product.image ? pb.getFileUrl(product, product.image) : '',
        });
      }
    } catch (err) {
      console.error('Error loading product details:', err);
    }
  };

  const handleRatingChange = (value: number) => {
    setFeedbackData(prev => ({ ...prev, rating: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFeedbackData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      setFeedbackData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Basic validation
      if (feedbackData.rating === 0) {
        throw new Error('Please provide a rating');
      }

      // Create form data for file uploads
      const formData = new FormData();
      formData.append('user', feedbackData.userId);
      formData.append('product', feedbackData.productId);
      formData.append('rating', feedbackData.rating.toString());
      
      if (feedbackData.title) {
        formData.append('title', feedbackData.title);
      }
      
      if (feedbackData.content) {
        formData.append('content', feedbackData.content);
      }
      
      // Add images if any
      feedbackData.images.forEach((image, index) => {
        formData.append('images', image);
      });

      // Submit to PocketBase
      const pb = new PocketBaseService();
      await pb.create('reviews', formData);

      // Show success toast
      toast({
        title: 'Thank you for your feedback!',
        description: 'Your review has been submitted successfully.',
        variant: 'default',
      });

      // Mark as submitted
      setIsSubmitted(true);
      
      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error message if token is invalid
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-red-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">{error}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Go to Homepage
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Show success message after submission
  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-green-500">
            <Check className="h-12 w-12 mx-auto mb-2" />
            Thank You!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">Your feedback has been submitted successfully.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Return to Homepage
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Product Feedback</CardTitle>
        <CardDescription>
          {productDetails ? `Share your experience with ${productDetails.name}` : 'Share your experience'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {productDetails && (
          <div className="mb-6 flex items-center">
            {productDetails.image && (
              <img 
                src={productDetails.image} 
                alt={productDetails.name} 
                className="w-16 h-16 object-cover rounded-md mr-4" 
              />
            )}
            <div>
              <h3 className="font-medium">{productDetails.name}</h3>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="text-center">
              <Label htmlFor="rating" className="block mb-2">
                How would you rate this product?
              </Label>
              <StarRating 
                value={feedbackData.rating} 
                onChange={handleRatingChange} 
                size={32} 
                className="mx-auto justify-center mb-4" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Review Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Summarize your experience"
                value={feedbackData.title}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Your Review</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="Tell us what you liked or didn't like about the product..."
                rows={4}
                value={feedbackData.content}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="images">Add Photos (optional)</Label>
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
              {feedbackData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {feedbackData.images.map((image, index) => (
                    <div key={index} className="relative w-16 h-16">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Upload ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Review'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm; 