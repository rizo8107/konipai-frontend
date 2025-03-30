import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Product, UpdateProductData } from '@/types/schema';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pb, getImageUrl } from '@/lib/pocketbase';

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSubmit: (data: { id: string; data: UpdateProductData }) => Promise<unknown>;
}

export function EditProductDialog({ open, onOpenChange, product, onSubmit }: EditProductDialogProps) {
  // Initialize form states with product data
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const [stock, setStock] = useState(product?.stock ? String(product.stock) : '');
  const [category, setCategory] = useState(product?.category || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(product?.status as 'active' | 'inactive' || 'active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Additional product fields
  const [material, setMaterial] = useState(product?.material || '');
  const [dimensions, setDimensions] = useState(product?.dimensions || '');
  const [features, setFeatures] = useState(product?.features || '');
  const [colors, setColors] = useState(product?.colors || '');
  const [tags, setTags] = useState(product?.tags || '');
  const [care, setCare] = useState(product?.care || '');
  const [specifications, setSpecifications] = useState(product?.specifications || '');
  const [careInstructions, setCareInstructions] = useState(product?.care_instructions || '');
  const [usageGuidelines, setUsageGuidelines] = useState(product?.usage_guidelines || '');
  const [review, setReview] = useState(product?.review ? String(product.review) : '0');
  const [bestseller, setBestseller] = useState(product?.bestseller || false);
  const [isNew, setIsNew] = useState(product?.new || false);
  const [inStock, setInStock] = useState(product?.inStock !== undefined ? product.inStock : true);
  
  // Image handling
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  
  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price ? String(product.price) : '');
      setStock(product.stock ? String(product.stock) : '');
      setCategory(product.category || '');
      setStatus(product.status as 'active' | 'inactive' || 'active');
      
      // Set additional fields
      setMaterial(product.material || '');
      setDimensions(product.dimensions || '');
      setFeatures(product.features || '');
      setColors(product.colors || '');
      setTags(product.tags || '');
      setCare(product.care || '');
      setSpecifications(product.specifications || '');
      setCareInstructions(product.care_instructions || '');
      setUsageGuidelines(product.usage_guidelines || '');
      setReview(product.review ? String(product.review) : '0');
      setBestseller(product.bestseller || false);
      setIsNew(product.new || false);
      setInStock(product.inStock !== undefined ? product.inStock : true);
      
      // Handle existing images
      if (product.images && Array.isArray(product.images)) {
        setExistingImages(product.images);
      } else if (product.image) {
        setExistingImages([product.image]);
      } else {
        setExistingImages([]);
      }
    }
  }, [product]);

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

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Function to get the full image URL for an image filename
  const getFullImageUrl = (filename: string) => {
    if (!product || !product.id) return '';
    if (filename.startsWith('http')) return filename; // Already a full URL
    
    return getImageUrl('products', product.id, filename);
  };

  // Function to convert comma-separated text to JSON array
  const formatJsonField = (value: string | number | boolean | null | undefined, isArray = true) => {
    // Handle null, undefined, or non-string values
    if (value === null || value === undefined) return '';
    
    // Convert to string if it's not already a string
    const strValue = typeof value === 'string' ? value : String(value);
    
    // Check for empty string after trimming
    if (!strValue.trim()) return '';
    
    try {
      // If it's already a string representation of JSON, just return it
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return value;
        } catch (e) {
          // Not valid JSON, continue with conversion
        }
      }
      
      // Convert from comma-separated text
      if (isArray) {
        const items = strValue.split(',').map(item => item.trim());
        return JSON.stringify(items);
      } else if (strValue.includes(',')) {
        // For colors, create an object with available and primary
        const colors = strValue.split(',').map(color => color.trim());
        if (colors.length > 0) {
          return JSON.stringify({
            available: colors,
            primary: colors[0]
          });
        }
      }
      
      // Single value, wrap in array if it's supposed to be an array
      return isArray ? JSON.stringify([strValue.trim()]) : JSON.stringify({ value: strValue.trim() });
    } catch (e) {
      console.error('Error formatting JSON field:', e);
      return isArray ? '[]' : '{}';
    }
  };

  const handleJsonFieldBlur = (e: React.FocusEvent<HTMLTextAreaElement>, isArray = true, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const { value } = e.target;
    const formattedValue = formatJsonField(value, isArray);
    
    if (formattedValue && formattedValue !== value) {
      setter(formattedValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id) return;

    try {
      setIsSubmitting(true);
      // Validate form fields
      if (!name) {
        toast.error('Product name is required');
        return;
      }

      if (!price || isNaN(Number(price)) || Number(price) <= 0) {
        toast.error('Please enter a valid price');
        return;
      }

      // Format JSON fields before submission
      const formattedFeatures = features ? formatJsonField(features, true) : undefined;
      const formattedColors = colors ? formatJsonField(colors, false) : undefined;
      const formattedTags = tags ? formatJsonField(tags, true) : undefined;
      const formattedCare = care ? formatJsonField(care, true) : undefined;
      const formattedSpecifications = specifications ? formatJsonField(specifications, false) : undefined;
      const formattedCareInstructions = careInstructions ? formatJsonField(careInstructions, false) : undefined;
      const formattedUsageGuidelines = usageGuidelines ? formatJsonField(usageGuidelines, false) : undefined;

      // Prepare the data object
      const updateData: UpdateProductData = {
        name,
        description: description || undefined,
        price: Number(price),
        stock: stock ? Number(stock) : undefined,
        category: category || undefined,
        status,
        material: material || undefined,
        dimensions: dimensions || undefined,
        features: formattedFeatures,
        colors: formattedColors,
        tags: formattedTags,
        care: formattedCare,
        specifications: formattedSpecifications,
        care_instructions: formattedCareInstructions,
        usage_guidelines: formattedUsageGuidelines,
        review: review ? Number(review) : undefined,
        bestseller,
        new: isNew,
        inStock,
      };

      // Handle images
      if (existingImages.length > 0) {
        if (existingImages.length === 1) {
          updateData.image = existingImages[0];
        } else {
          updateData.images = existingImages;
        }
      } else {
        // Clear images if none are left
        updateData.image = '';
        updateData.images = [];
      }

      // Submit the form
      await onSubmit({ id: product.id, data: updateData });
      
      // If we have new uploaded images, we would handle them here
      if (uploadedImages.length > 0) {
        // Note: In a real implementation, we would need to upload these files
        console.log(`${uploadedImages.length} new images ready for upload`);
      }
      
      onOpenChange(false);
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product information and details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="care">Care & Usage</TabsTrigger>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-1">
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Product name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Product description"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="Available quantity"
                      type="number"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Product category"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as 'active' | 'inactive')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Product Status</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="inStock">In Stock</Label>
                      </div>
                      <Switch
                        id="inStock"
                        checked={inStock}
                        onCheckedChange={setInStock}
                      />
                    </div>
                    
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="isNew">New</Label>
                      </div>
                      <Switch
                        id="isNew"
                        checked={isNew}
                        onCheckedChange={setIsNew}
                      />
                    </div>
                    
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="bestseller">Bestseller</Label>
                      </div>
                      <Switch
                        id="bestseller"
                        checked={bestseller}
                        onCheckedChange={setBestseller}
                      />
                    </div>
                  </CardContent>
                </Card>
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
                      {/* Existing Images */}
                      {existingImages.map((url, index) => (
                        <div key={`existing-${index}`} className="relative group overflow-hidden rounded-md border">
                          <AspectRatio ratio={1 / 1}>
                            <img 
                              src={getFullImageUrl(url)} 
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
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                            aria-label={`Remove image ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      {/* New Images */}
                      {imagePreviewUrls.map((url, index) => (
                        <div key={`new-${index}`} className="relative group overflow-hidden rounded-md border">
                          <AspectRatio ratio={1 / 1}>
                            <img 
                              src={url} 
                              alt={`New product image ${index + 1}`} 
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
                            aria-label={`Remove new image ${index + 1}`}
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
                    
                    <Label className="text-xs text-muted-foreground">
                      Upload multiple product images. The first image will be used as the main product image.
                    </Label>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="material">Material</Label>
                    <Input
                      id="material"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="e.g., 100% Cotton Canvas"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dimensions">Dimensions</Label>
                    <Input
                      id="dimensions"
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      placeholder='e.g., 16"H x 14"W x 4"D'
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Features</Label>
                  <Textarea
                    id="features"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                    placeholder='Enter features separated by commas or as JSON array'
                    onBlur={(e) => handleJsonFieldBlur(e, true, setFeatures)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter features as comma-separated values or a JSON array of strings
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colors">Colors</Label>
                  <Textarea
                    id="colors"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder='Enter colors separated by commas or as JSON object'
                    onBlur={(e) => handleJsonFieldBlur(e, false, setColors)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter colors as comma-separated values or a JSON object with "available" array and "primary" color
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Textarea
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder='Enter tags separated by commas or as JSON array'
                    onBlur={(e) => handleJsonFieldBlur(e, true, setTags)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter tags as comma-separated values or a JSON array of strings
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review">Review Rating (0-5)</Label>
                  <Input
                    id="review"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="0"
                  />
                </div>
              </TabsContent>

              <TabsContent value="attributes" className="space-y-4 mt-0">
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
                <div className="space-y-2">
                  <Label htmlFor="care">Care Instructions</Label>
                  <Textarea
                    id="care"
                    value={care}
                    onChange={(e) => setCare(e.target.value)}
                    placeholder='Enter care instructions separated by commas or as JSON array'
                    onBlur={(e) => handleJsonFieldBlur(e, true, setCare)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter care instructions as comma-separated values or a JSON array of strings
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="care_instructions">Detailed Care Instructions</Label>
                  <Textarea
                    id="care_instructions"
                    value={careInstructions}
                    onChange={(e) => setCareInstructions(e.target.value)}
                    className="min-h-[150px]"
                    placeholder='Enter as JSON object or use the format described below'
                    onBlur={(e) => handleJsonFieldBlur(e, false, setCareInstructions)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter as JSON object with "cleaning" and "storage" arrays or use the proper JSON format
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usage_guidelines">Usage Guidelines</Label>
                  <Textarea
                    id="usage_guidelines"
                    value={usageGuidelines}
                    onChange={(e) => setUsageGuidelines(e.target.value)}
                    className="min-h-[150px]"
                    placeholder='Enter as JSON object or use the format described below'
                    onBlur={(e) => handleJsonFieldBlur(e, false, setUsageGuidelines)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter as JSON object with "recommended_use" and "pro_tips" arrays or use the proper JSON format
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="specs" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="specifications">Product Specifications</Label>
                  <Textarea
                    id="specifications"
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    className="min-h-[200px]"
                    placeholder='Enter as JSON object or use the format described below'
                    onBlur={(e) => handleJsonFieldBlur(e, false, setSpecifications)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    Enter product specifications as a JSON object with key-value pairs
                  </Label>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <Alert className="mt-6 bg-muted/50">
            <AlertDescription>
              For JSON fields, you can enter simple text and it will be automatically converted to JSON format. For example, enter <code>Red, Blue, Green</code> for colors or tags.
            </AlertDescription>
          </Alert>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
