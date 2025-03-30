import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { CreateProductData } from '@/types/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pb, getImageUrl } from '@/lib/pocketbase';

// Define the type for ProductFormValues
type ProductFormValues = {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  category?: string;
  status: 'active' | 'inactive';
  material?: string;
  dimensions?: string;
  features?: string;
  colors?: string;
  tags?: string;
  care?: string;
  specifications?: string;
  care_instructions?: string;
  usage_guidelines?: string;
  bestseller?: boolean;
  new?: boolean;
  inStock?: boolean;
  review?: number;
};

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProductData) => Promise<void>;
}

export function CreateProductDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  // Define form schema
  const formSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    price: z.number().min(0.01, 'Price must be greater than 0'),
    stock: z.number().optional(),
    category: z.string().optional(),
    status: z.enum(['active', 'inactive']),
    material: z.string().optional(),
    dimensions: z.string().optional(),
    features: z.string().optional(),
    colors: z.string().optional(),
    tags: z.string().optional(),
    care: z.string().optional(),
    specifications: z.string().optional(),
    care_instructions: z.string().optional(),
    usage_guidelines: z.string().optional(),
    bestseller: z.boolean().default(false),
    new: z.boolean().default(false),
    inStock: z.boolean().default(true),
    review: z.number().min(0).max(5).optional(),
  });
  
  // Initialize form
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      stock: undefined,
      category: '',
      status: 'active',
      material: '',
      dimensions: '',
      features: '',
      colors: '',
      tags: '',
      care: '',
      specifications: '',
      care_instructions: '',
      usage_guidelines: '',
      bestseller: false,
      new: false,
      inStock: true,
      review: 0,
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Create preview URLs for the new files
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      
      // Update state with new files and preview URLs
      setUploadedImages(prev => [...prev, ...newFiles]);
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    // Remove the image and its preview URL
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Function to convert comma-separated text to JSON array
  const formatJsonField = (value: string, isArray = true) => {
    if (!value.trim()) return '';
    
    try {
      // Check if it's already valid JSON
      JSON.parse(value);
      return value;
    } catch (e) {
      // Not valid JSON, try to convert from comma-separated text
      if (isArray) {
        const items = value.split(',').map(item => item.trim());
        return JSON.stringify(items);
      } else if (value.includes(',')) {
        // For colors, create an object with available and primary
        const colors = value.split(',').map(color => color.trim());
        if (colors.length > 0) {
          return JSON.stringify({
            available: colors,
            primary: colors[0]
          });
        }
      }
      return value;
    }
  };

  const handleJsonFieldBlur = (e: React.FocusEvent<HTMLTextAreaElement>, isArray = true) => {
    const { name, value } = e.target;
    const formattedValue = formatJsonField(value, isArray);
    
    if (formattedValue && formattedValue !== value) {
      form.setValue(name as keyof ProductFormValues, formattedValue);
    }
  };

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Format JSON fields before submission
      const processedValues = { ...values };
      
      // Process array fields
      ['features', 'tags', 'care'].forEach(field => {
        if (processedValues[field as keyof ProductFormValues]) {
          const value = processedValues[field as keyof ProductFormValues] as string;
          processedValues[field as keyof ProductFormValues] = formatJsonField(value, true) as string;
        }
      });
      
      // Process object fields
      ['colors', 'specifications', 'care_instructions', 'usage_guidelines'].forEach(field => {
        if (processedValues[field as keyof ProductFormValues]) {
          const value = processedValues[field as keyof ProductFormValues] as string;
          processedValues[field as keyof ProductFormValues] = formatJsonField(value, false) as string;
        }
      });
      
      // Format JSON fields properly
      const productData: CreateProductData = {
        name: processedValues.name,
        description: processedValues.description,
        price: processedValues.price,
        category: processedValues.category,
        material: processedValues.material,
        dimensions: processedValues.dimensions,
        bestseller: processedValues.bestseller,
        new: processedValues.new,
        inStock: processedValues.inStock,
        review: processedValues.review,
        status: processedValues.status,
      };

      // Handle JSON fields
      if (processedValues.features) {
        productData.features = processedValues.features;
      }

      if (processedValues.care) {
        productData.care = processedValues.care;
      }

      if (processedValues.tags) {
        productData.tags = processedValues.tags;
      }

      if (processedValues.colors) {
        productData.colors = processedValues.colors;
      }

      if (processedValues.specifications) {
        productData.specifications = processedValues.specifications;
      }

      if (processedValues.care_instructions) {
        productData.care_instructions = processedValues.care_instructions;
      }

      if (processedValues.usage_guidelines) {
        productData.usage_guidelines = processedValues.usage_guidelines;
      }

      // Handle stock
      if (processedValues.stock !== undefined) {
        productData.stock = processedValues.stock;
      }

      // Handle image uploads
      if (uploadedImages.length > 0) {
        const uploadedImageIds = await Promise.all(uploadedImages.map(async (image) => {
          const formData = new FormData();
          formData.append('file', image);
          const record = await pb.collection('images').create(formData);
          return record.id;
        }));

        // Add uploaded image IDs to product data
        productData.images = uploadedImageIds;
      }

      // Submit the form
      await onSubmit(productData);
      
      // Reset form and state
      form.reset();
      // Clean up image preview URLs to prevent memory leaks
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setUploadedImages([]);
      setImagePreviewUrls([]);
      onOpenChange(false);
      toast.success('Product created successfully');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Product</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new product.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-6 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="attributes">Attributes</TabsTrigger>
                <TabsTrigger value="care">Care & Usage</TabsTrigger>
                <TabsTrigger value="specs">Specifications</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto px-1">
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <Input {...field} placeholder="Product name" />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <Textarea
                            {...field}
                            placeholder="Product description"
                            className="resize-none"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              placeholder="0.00"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Input {...field} placeholder="Enter category" />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock</FormLabel>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Available quantity"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Product Status</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="inStock"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>In Stock</FormLabel>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="new"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>New</FormLabel>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bestseller"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Bestseller</FormLabel>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Product Images
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group overflow-hidden rounded-md border">
                            <AspectRatio ratio={1 / 1}>
                              <img 
                                src={url} 
                                alt={`Product image ${index + 1}`} 
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/darkgray/white?text=Image+Not+Found';
                                }}
                              />
                            </AspectRatio>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                              aria-label={`Remove image ${index + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        
                        <div className="flex items-center justify-center rounded-md border border-dashed p-4 h-full min-h-[150px]">
                          <label htmlFor="image-upload" className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">Upload Image</span>
                              <span className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB</span>
                            </div>
                            <input 
                              id="image-upload" 
                              type="file" 
                              accept="image/*" 
                              multiple 
                              className="sr-only" 
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                      </div>
                      
                      <FormDescription>
                        Upload multiple product images. The first image will be used as the main product image.
                      </FormDescription>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material</FormLabel>
                          <Input {...field} placeholder="e.g., 100% Cotton Canvas" />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions</FormLabel>
                          <Input {...field} placeholder='e.g., 16"H x 14"W x 4"D' />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <Textarea
                          {...field}
                          placeholder='Enter features separated by commas or as JSON array'
                          onBlur={(e) => handleJsonFieldBlur(e, true)}
                        />
                        <FormDescription>
                          Enter features as comma-separated values or a JSON array of strings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="colors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Colors</FormLabel>
                        <Textarea
                          {...field}
                          placeholder='Enter colors separated by commas or as JSON object'
                          onBlur={(e) => handleJsonFieldBlur(e, false)}
                        />
                        <FormDescription>
                          Enter colors as comma-separated values or a JSON object with "available" array and "primary" color
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <Textarea
                          {...field}
                          placeholder='Enter tags separated by commas or as JSON array'
                          onBlur={(e) => handleJsonFieldBlur(e, true)}
                        />
                        <FormDescription>
                          Enter tags as comma-separated values or a JSON array of strings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="review"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Rating (0-5)</FormLabel>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="attributes" className="space-y-4 mt-0">
                  {/* This tab will be for future attributes */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Attributes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Additional product attributes will be added here in the future.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="care" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="care"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Care Instructions</FormLabel>
                        <Textarea
                          {...field}
                          placeholder='Enter care instructions separated by commas or as JSON array'
                          onBlur={(e) => handleJsonFieldBlur(e, true)}
                        />
                        <FormDescription>
                          Enter care instructions as comma-separated values or a JSON array of strings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="care_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detailed Care Instructions</FormLabel>
                        <Textarea
                          {...field}
                          className="min-h-[150px]"
                          placeholder='Enter as JSON object or use the format described below'
                          onBlur={(e) => handleJsonFieldBlur(e, false)}
                        />
                        <FormDescription>
                          Enter as JSON object with "cleaning" and "storage" arrays or use the proper JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="usage_guidelines"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usage Guidelines</FormLabel>
                        <Textarea
                          {...field}
                          className="min-h-[150px]"
                          placeholder='Enter as JSON object or use the format described below'
                          onBlur={(e) => handleJsonFieldBlur(e, false)}
                        />
                        <FormDescription>
                          Enter as JSON object with "recommended_use" and "pro_tips" arrays or use the proper JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="specs" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="specifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Specifications</FormLabel>
                        <Textarea
                          {...field}
                          className="min-h-[200px]"
                          placeholder='Enter as JSON object or use the format described below'
                          onBlur={(e) => handleJsonFieldBlur(e, false)}
                        />
                        <FormDescription>
                          Enter product specifications as a JSON object with key-value pairs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>
            </Tabs>

            <Alert className="mt-6 bg-muted/50">
              <AlertDescription>
                For fields like Features, Colors, and Tags, you can enter simple comma-separated values and they will be automatically converted to the required JSON format.
              </AlertDescription>
            </Alert>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
