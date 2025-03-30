import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FeedbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get the token from the URL
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-4 flex items-center gap-1" 
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Homepage</span>
      </Button>

      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Product Feedback</h1>
        
        {token ? (
          <FeedbackForm token={token} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-red-500 flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Invalid Link
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4">
                This feedback link is invalid or has expired. Please use the link provided in your delivery confirmation message.
              </p>
              <Button onClick={() => navigate('/')}>
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage; 