import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Edit, Trash2, Plus, Save, X, CheckCircle2 } from 'lucide-react';
import { EmailTemplate } from '@/lib/email';
import { useEmailTemplates, EmailTemplateType } from '@/hooks/useEmailTemplates';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { generateTemplateContent, generateTemplateDescription } from '@/lib/gemini';

export default function EmailTemplatesPage() {
  const { templates, isLoading, updateTemplate, createTemplate, deleteTemplate } = useEmailTemplates();
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplateType | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    content: '',
    requiresAdditionalInfo: false,
    additionalInfoLabel: '',
    additionalInfoPlaceholder: '',
    isActive: true,
    description: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Filter templates based on search term
  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditTemplate = (template: EmailTemplateType) => {
    setCurrentTemplate(template);
    setEditDialogOpen(true);
  };

  const handleUpdateTemplate = async () => {
    if (!currentTemplate) return;
    
    try {
      await updateTemplate(currentTemplate.id, currentTemplate);
      toast.success('Template updated successfully');
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content || !newTemplate.subject) {
      toast.error('Name, subject, and content are required');
      return;
    }
    
    try {
      await createTemplate(newTemplate);
      toast.success('Template created successfully');
      setCreateDialogOpen(false);
      setNewTemplate({
        name: '',
        subject: '',
        content: '',
        requiresAdditionalInfo: false,
        additionalInfoLabel: '',
        additionalInfoPlaceholder: '',
        isActive: true,
        description: ''
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteTemplate(id);
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const renderTemplatePreview = (content: string) => {
    return content.split('\n').map((line, index) => (
      <p key={index} className={line.trim() === '' ? 'h-4' : ''}>
        {line}
      </p>
    ));
  };

  // Template variable options for the command menu
  const variableOptions = [
    { value: '{{customerName}}', label: 'Customer Name', description: 'The name of the customer' },
    { value: '{{orderId}}', label: 'Order ID', description: 'The unique identifier for the order' },
    { value: '{{orderDate}}', label: 'Order Date', description: 'The date when the order was placed' },
    { value: '{{amount}}', label: 'Order Amount', description: 'The total amount of the order' },
    { value: '{{productDetails}}', label: 'Product Details', description: 'List of products in the order' },
    { value: '{{trackingLink}}', label: 'Tracking Link', description: 'Link to track the shipment' },
    { value: '{{carrier}}', label: 'Shipping Carrier', description: 'Name of the shipping carrier' },
    { value: '{{estimatedDelivery}}', label: 'Estimated Delivery', description: 'Estimated delivery date' },
    { value: '{{feedbackLink}}', label: 'Feedback Link', description: 'Link for customer feedback' },
    { value: '{{reviewLink}}', label: 'Review Link', description: 'Link for product review' },
    { value: '{{refundAmount}}', label: 'Refund Amount', description: 'Amount refunded to the customer' },
    { value: '{{reorderLink}}', label: 'Reorder Link', description: 'Link to reorder the same products' },
    { value: '{{daysSinceDelivery}}', label: 'Days Since Delivery', description: 'Number of days since the order was delivered' },
    { value: '{{cartUrl}}', label: 'Cart URL', description: 'Link to the abandoned cart' },
    { value: '{{retryUrl}}', label: 'Payment Retry URL', description: 'Link to retry a failed payment' },
  ];

  // Insert variable at cursor position in textarea
  const insertVariable = (variable: string, target: 'edit' | 'new') => {
    const textarea = document.getElementById(target === 'edit' ? 'edit-content' : 'new-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    const newText = before + variable + after;
    
    if (target === 'edit' && currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        content: newText
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        content: newText
      });
    }
    
    // Focus and set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Generate template content using AI
  const generateTemplate = async (templateType: string, target: 'edit' | 'new') => {
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      // Generate description if not provided
      let description = target === 'edit' 
        ? currentTemplate?.description || '' 
        : newTemplate.description;
      
      if (!description) {
        description = await generateTemplateDescription(templateType);
      }
      
      // Generate content
      const content = await generateTemplateContent(templateType, description);
      
      // Update the appropriate template
      if (target === 'edit' && currentTemplate) {
        setCurrentTemplate({
          ...currentTemplate,
          content,
          description: description || currentTemplate.description
        });
      } else {
        setNewTemplate({
          ...newTemplate,
          content,
          description: description || newTemplate.description
        });
      }
      
      toast.success('Template content generated successfully');
    } catch (error) {
      console.error('Error generating template:', error);
      setGenerationError('Failed to generate template content. Please try again.');
      toast.error('Failed to generate template content');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader heading="Email Templates" text="Manage your email templates for customer communications" />
      
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center mb-6">
          <div className="w-1/3">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Email Template</DialogTitle>
                <DialogDescription>
                  Create a new email template for customer communications.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-name">Template Name</Label>
                    <Input
                      id="new-name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      placeholder="e.g., order_confirmation"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="new-subject">Email Subject</Label>
                    <Input
                      id="new-subject"
                      value={newTemplate.subject}
                      onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                      placeholder="e.g., Your Order Confirmation - {{orderId}}"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="new-content">Template Content</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          Insert Variable
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Search variables..." />
                          <CommandList>
                            <CommandEmpty>No variables found.</CommandEmpty>
                            <CommandGroup>
                              {variableOptions.map((variable) => (
                                <CommandItem
                                  key={variable.value}
                                  onSelect={() => insertVariable(variable.value, 'new')}
                                >
                                  <span className="font-medium">{variable.label}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {variable.value}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Textarea
                    id="new-content"
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    placeholder="Dear {{customerName}},\n\nThank you for your order..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="new-description">Description</Label>
                  <Input
                    id="new-description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="e.g., Sent to customers after they place an order"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="new-requires-additional-info"
                    checked={newTemplate.requiresAdditionalInfo}
                    onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, requiresAdditionalInfo: checked })}
                  />
                  <Label htmlFor="new-requires-additional-info">Requires Additional Information</Label>
                </div>
                
                {newTemplate.requiresAdditionalInfo && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-additional-info-label">Additional Info Label</Label>
                      <Input
                        id="new-additional-info-label"
                        value={newTemplate.additionalInfoLabel}
                        onChange={(e) => setNewTemplate({ ...newTemplate, additionalInfoLabel: e.target.value })}
                        placeholder="e.g., Tracking Link"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="new-additional-info-placeholder">Additional Info Placeholder</Label>
                      <Input
                        id="new-additional-info-placeholder"
                        value={newTemplate.additionalInfoPlaceholder}
                        onChange={(e) => setNewTemplate({ ...newTemplate, additionalInfoPlaceholder: e.target.value })}
                        placeholder="e.g., https://tracking.example.com/123"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="new-is-active"
                    checked={newTemplate.isActive}
                    onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, isActive: checked })}
                  />
                  <Label htmlFor="new-is-active">Active</Label>
                </div>
                
                {generationError && (
                  <div className="text-red-500 text-sm">{generationError}</div>
                )}
              </div>
              
              <DialogFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => generateTemplate(newTemplate.name, 'new')}
                  disabled={isGenerating || !newTemplate.name}
                >
                  {isGenerating ? 'Generating...' : 'Generate with AI'}
                </Button>
                <div className="space-x-2">
                  <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate}>
                    Create Template
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8">
            {searchTerm ? 'No templates match your search.' : 'No templates found. Create your first template!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className={!template.isActive ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        <Mail className="mr-2 h-4 w-4" />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Subject: {template.subject}
                  </div>
                  {!template.isActive && (
                    <div className="text-xs text-amber-600 mt-1">Inactive</div>
                  )}
                </CardHeader>
                <CardContent className="pb-2">
                  <Tabs defaultValue="content">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="content" className="font-mono text-xs">
                      <ScrollArea className="h-[150px] w-full rounded-md border p-2">
                        <pre className="whitespace-pre-wrap">{template.content}</pre>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="preview">
                      <ScrollArea className="h-[150px] w-full rounded-md border p-2">
                        <div className="text-sm">
                          {renderTemplatePreview(template.content)}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="w-full text-xs text-muted-foreground">
                    {template.requiresAdditionalInfo && (
                      <div className="flex items-center">
                        <span className="font-medium mr-1">Additional Info:</span>
                        {template.additionalInfoLabel}
                      </div>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {currentTemplate && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Email Template</DialogTitle>
              <DialogDescription>
                Update the email template for customer communications.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Template Name</Label>
                  <Input
                    id="edit-name"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                    placeholder="e.g., order_confirmation"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-subject">Email Subject</Label>
                  <Input
                    id="edit-subject"
                    value={currentTemplate.subject}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
                    placeholder="e.g., Your Order Confirmation - {{orderId}}"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="edit-content">Template Content</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        Insert Variable
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search variables..." />
                        <CommandList>
                          <CommandEmpty>No variables found.</CommandEmpty>
                          <CommandGroup>
                            {variableOptions.map((variable) => (
                              <CommandItem
                                key={variable.value}
                                onSelect={() => insertVariable(variable.value, 'edit')}
                              >
                                <span className="font-medium">{variable.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {variable.value}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Textarea
                  id="edit-content"
                  value={currentTemplate.content}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
                  placeholder="Dear {{customerName}},\n\nThank you for your order..."
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={currentTemplate.description}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                  placeholder="e.g., Sent to customers after they place an order"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-requires-additional-info"
                  checked={currentTemplate.requiresAdditionalInfo}
                  onCheckedChange={(checked) => setCurrentTemplate({ ...currentTemplate, requiresAdditionalInfo: checked })}
                />
                <Label htmlFor="edit-requires-additional-info">Requires Additional Information</Label>
              </div>
              
              {currentTemplate.requiresAdditionalInfo && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-additional-info-label">Additional Info Label</Label>
                    <Input
                      id="edit-additional-info-label"
                      value={currentTemplate.additionalInfoLabel || ''}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, additionalInfoLabel: e.target.value })}
                      placeholder="e.g., Tracking Link"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-additional-info-placeholder">Additional Info Placeholder</Label>
                    <Input
                      id="edit-additional-info-placeholder"
                      value={currentTemplate.additionalInfoPlaceholder || ''}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, additionalInfoPlaceholder: e.target.value })}
                      placeholder="e.g., https://tracking.example.com/123"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-active"
                  checked={currentTemplate.isActive}
                  onCheckedChange={(checked) => setCurrentTemplate({ ...currentTemplate, isActive: checked })}
                />
                <Label htmlFor="edit-is-active">Active</Label>
              </div>
              
              {generationError && (
                <div className="text-red-500 text-sm">{generationError}</div>
              )}
            </div>
            
            <DialogFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => generateTemplate(currentTemplate.name, 'edit')}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
              <div className="space-x-2">
                <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTemplate}>
                  Update Template
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
