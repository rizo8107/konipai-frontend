import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LockKeyhole, Mail, Loader2 } from 'lucide-react';
import { authenticateAdmin, pb } from '@/lib/pocketbase';
import { frontendConfig } from '../../frontend.config';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Try to authenticate with PocketBase admin API
      await authenticateAdmin(email, password);
      
      toast({
        title: 'Login Successful',
        description: 'Welcome to Konipai CRM',
      });
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback to demo credentials for testing
      if (email === 'admin@konipai.com' && password === 'admin') {
        toast({
          title: 'Demo Login Successful',
          description: 'Using demo credentials',
        });
        navigate('/admin');
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-konipai-50 via-white to-konipai-100 dark:from-konipai-950 dark:via-gray-900 dark:to-konipai-900 p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-5 pointer-events-none"></div>
      
      <div className="w-full max-w-md relative">
        {/* Decorative elements */}
        <div className="absolute -top-6 -left-6 w-20 h-20 bg-konipai-200 dark:bg-konipai-800 rounded-full blur-xl opacity-60"></div>
        <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-konipai-300 dark:bg-konipai-700 rounded-full blur-xl opacity-60"></div>
        
        <Card className="w-full border-0 shadow-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex justify-center mb-2">
              {frontendConfig.site.logo ? (
                <img 
                  src={frontendConfig.site.logo} 
                  alt={frontendConfig.site.title}
                  className="h-14 w-auto object-contain" 
                />
              ) : (
                <div className="h-12 w-12 bg-konipai-600 text-white rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold">K</span>
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-konipai-600 to-konipai-400 bg-clip-text text-transparent">
              {frontendConfig.site.title}
            </CardTitle>
            <CardDescription className="text-center text-gray-500 dark:text-gray-400">
              Sign in to your account to access the dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-konipai-500 transition-colors duration-200" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@konipai.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-md border-gray-200 dark:border-gray-700 focus:border-konipai-400 focus:ring-konipai-400 dark:focus:border-konipai-500 dark:focus:ring-konipai-500 transition-all duration-200"
                    required
                  />
                  <div className="absolute inset-0 rounded-md border border-konipai-400 dark:border-konipai-500 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-200"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <a href="#" className="text-xs font-medium text-konipai-600 hover:text-konipai-500 dark:text-konipai-400 dark:hover:text-konipai-300 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative group">
                  <LockKeyhole className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-konipai-500 transition-colors duration-200" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 rounded-md border-gray-200 dark:border-gray-700 focus:border-konipai-400 focus:ring-konipai-400 dark:focus:border-konipai-500 dark:focus:ring-konipai-500 transition-all duration-200"
                    required
                  />
                  <div className="absolute inset-0 rounded-md border border-konipai-400 dark:border-konipai-500 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-200"></div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 mt-2 text-sm font-medium bg-gradient-to-r from-konipai-600 to-konipai-500 hover:from-konipai-500 hover:to-konipai-400 text-white shadow-md hover:shadow-lg transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="pt-2 pb-6 border-t border-gray-100 dark:border-gray-800">
            <div className="w-full text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Demo credentials
              </p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md font-mono">
                  admin@konipai.com
                </div>
                <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md font-mono">
                  admin
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
