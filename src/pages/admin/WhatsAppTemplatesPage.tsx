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
import { MessageSquare, Edit, Trash2, Plus, Save, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { WhatsAppTemplate } from '@/lib/whatsapp';
import { useWhatsAppTemplates, Template } from '@/hooks/useWhatsAppTemplates';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { generateTemplateContent, generateTemplateDescription } from '@/lib/gemini';
import { FixWhatsAppTemplates } from '@/components/admin/FixWhatsAppTemplates';

export default function WhatsAppTemplatesPage() {
  const { templates, isLoading, updateTemplate, createTemplate, deleteTemplate, fetchTemplates } = useWhatsAppTemplates();
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
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
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditTemplate = (template: Template) => {
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
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Name and content are required');
      return;
    }
    
    try {
      await createTemplate(newTemplate);
      toast.success('Template created successfully');
      setCreateDialogOpen(false);
      setNewTemplate({
        name: '',
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
      <p key={index} className={line.startsWith('*') ? 'font-bold' : ''}>
        {line}
      </p>
    ));
  };

  // Available template variables
  const templateVariables = [
    { name: 'customerName', description: 'Customer\'s full name' },
    { name: 'orderId', description: 'Order ID or reference number' },
    { name: 'amount', description: 'Payment amount' },
    { name: 'retryUrl', description: 'URL to retry payment' },
    { name: 'carrier', description: 'Shipping carrier name' },
    { name: 'trackingLink', description: 'Tracking URL for shipment' },
    { name: 'estimatedDelivery', description: 'Estimated delivery date' },
    { name: 'feedbackLink', description: 'Link to leave feedback' },
    { name: 'reviewLink', description: 'Link to leave a review' },
    { name: 'refundAmount', description: 'Amount refunded to customer' },
    { name: 'daysSinceDelivery', description: 'Days since order was delivered' },
    { name: 'reorderLink', description: 'Link to reorder products' },
    { name: 'cartUrl', description: 'URL to abandoned cart' },
  ];

  // Insert variable at cursor position
  const insertVariable = (textAreaId: string, variable: string) => {
    const textarea = document.getElementById(textAreaId) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    const newText = `${before}{{${variable}}}${after}`;
    
    if (textAreaId === 'content') {
      setCurrentTemplate({ ...currentTemplate!, content: newText });
    } else if (textAreaId === 'new-content') {
      setNewTemplate({ ...newTemplate, content: newText });
    }
    
    // Focus and set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + variable.length + 4; // +4 for the {{ and }}
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Generate template content using Gemini AI
  const handleGenerateContent = async () => {
    if (!newTemplate.name) {
      toast.error('Please enter a template name first');
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationError(null);

      // Generate template content
      const description = newTemplate.description || await generateTemplateDescription(newTemplate.name);
      const content = await generateTemplateContent(newTemplate.name, description);

      // Update the new template with generated content
      setNewTemplate(prev => ({
        ...prev,
        content,
        description: description || prev.description
      }));

      toast.success('Template generated successfully!');
    } catch (error) {
      console.error('Template generation error:', error);
      setGenerationError(error.message);
      
      // Provide fallback templates for common types
      if (newTemplate.name.toLowerCase().includes('track')) {
        const fallbackTemplate = '🚚 *Track Your Order* 🚚\n\nHi {{customerName}},\n\nYour order #{{orderId}} is on its way!\n\nTrack your delivery here: {{trackingLink}}\n\nCarrier: {{carrier}}\nEstimated delivery: {{estimatedDelivery}}\n\nQuestions? Reply to this message for assistance.';
        setNewTemplate(prev => ({
          ...prev,
          content: fallbackTemplate,
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Tracking Link & Carrier',
          additionalInfoPlaceholder: 'https://tracking.com/123456,FedEx'
        }));
        toast.info('Using fallback template due to API error');
      } else {
        toast.error(`Failed to generate template: ${error.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          heading="WhatsApp Templates"
          subheading="Manage and customize your WhatsApp message templates"
          icon={<MessageSquare className="h-6 w-6" />}
        />
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute left-3 top-2.5 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
              </div>
              
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Template
              </Button>
            </div>

            {isLoading ? (
              <p>Loading templates...</p>
            ) : filteredTemplates.length === 0 ? (
              <p>No templates found. Create your first template to get started.</p>
            ) : (
              <div className="space-y-4">
                {hasDuplicateTemplates(templates) && (
                  <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                    <CardContent className="p-4 flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Duplicate templates detected. Use the "Fix Templates" tool to resolve issues.
                      </p>
                    </CardContent>
                  </Card>
                )}
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className={!template.isActive ? 'opacity-70' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="mt-1">{template.description}</CardDescription>
                        </div>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted p-3 rounded-md max-h-[200px] overflow-y-auto whitespace-pre-wrap text-sm">
                        {renderTemplatePreview(template.content)}
                      </div>
                      {template.requiresAdditionalInfo && (
                        <div className="mt-3 text-sm">
                          <p className="text-muted-foreground">Requires additional info: {template.additionalInfoLabel}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <FixWhatsAppTemplates onTemplatesFixed={fetchTemplates} />
          </div>
        </div>

        {/* Edit Template Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update your WhatsApp message template details.
              </DialogDescription>
            </DialogHeader>
            {currentTemplate && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={currentTemplate.description}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, description: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Template Content</Label>
                  <div className="flex items-start">
                    <Textarea
                      id="content"
                      value={currentTemplate?.content}
                      onChange={(e) => setCurrentTemplate({...currentTemplate!, content: e.target.value})}
                      rows={6}
                      placeholder="Enter template content. Use *text* for bold formatting."
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="ml-2 flex items-center gap-2" type="button">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21s-4-3-4-9 4-9 4-9"/><path d="M16 3s4 3 4 9-4 9-4 9"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                          <span>Add Variables</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search variables..." />
                          <CommandList>
                            <CommandEmpty>No variables found.</CommandEmpty>
                            <CommandGroup heading="Available Variables">
                              {templateVariables.map((variable) => (
                                <CommandItem key={variable.name} onSelect={() => insertVariable('content', variable.name)}>
                                  <span className="font-medium">{`{{${variable.name}}}`}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{variable.description}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requiresAdditionalInfo"
                    checked={currentTemplate.requiresAdditionalInfo}
                    onCheckedChange={(checked) => setCurrentTemplate({...currentTemplate, requiresAdditionalInfo: checked})}
                  />
                  <Label htmlFor="requiresAdditionalInfo">Requires Additional Information</Label>
                </div>

                {currentTemplate.requiresAdditionalInfo && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="additionalInfoLabel">Additional Info Label</Label>
                      <Input
                        id="additionalInfoLabel"
                        value={currentTemplate.additionalInfoLabel}
                        onChange={(e) => setCurrentTemplate({...currentTemplate, additionalInfoLabel: e.target.value})}
                        placeholder="e.g., Tracking Number"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="additionalInfoPlaceholder">Additional Info Placeholder</Label>
                      <Input
                        id="additionalInfoPlaceholder"
                        value={currentTemplate.additionalInfoPlaceholder}
                        onChange={(e) => setCurrentTemplate({...currentTemplate, additionalInfoPlaceholder: e.target.value})}
                        placeholder="e.g., Enter tracking number"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={currentTemplate.isActive}
                    onCheckedChange={(checked) => setCurrentTemplate({...currentTemplate, isActive: checked})}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="pt-4">
                  <Label>Preview</Label>
                  <div className="bg-[#0b141a] p-4 mt-2 rounded-md">
                    <div className="bg-[#005c4b] text-white p-3 rounded-lg max-w-[80%] ml-auto whitespace-pre-wrap text-sm">
                      {renderTemplatePreview(currentTemplate.content)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateTemplate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Template Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription>
                Create a new WhatsApp message template.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., order_confirmation"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="e.g., Sent when an order is confirmed"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-content">Template Content</Label>
                <div className="relative">
                  <Textarea
                    id="template-content"
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    placeholder="Enter your template content with variables like {{customerName}}"
                    className="min-h-[200px] font-mono text-sm resize-y"
                  />
                  <div className="flex gap-2 mt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" type="button">
                          <span className="mr-1">Variables</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60">
                        <div className="space-y-2">
                          <h4 className="font-medium">Common Variables</h4>
                          <div className="grid gap-1">
                            {['customerName', 'orderId', 'amount', 'feedbackLink'].map((variable) => (
                              <Button
                                key={variable}
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                                onClick={() => {
                                  setNewTemplate({
                                    ...newTemplate,
                                    content: newTemplate.content + `{{${variable}}}`
                                  });
                                }}
                              >
                                {`{{${variable}}}`}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button" 
                      onClick={handleGenerateContent}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <span className="mr-1">Generating...</span>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          <span className="mr-1">Generate with AI</span>
                        </>
                      )}
                    </Button>
                  </div>
                  {generationError && (
                    <p className="text-sm text-red-500 mt-2">{generationError}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires-additional-info"
                    checked={newTemplate.requiresAdditionalInfo}
                    onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, requiresAdditionalInfo: checked })}
                  />
                  <Label htmlFor="requires-additional-info">Requires Additional Information</Label>
                </div>
              </div>
              {newTemplate.requiresAdditionalInfo && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="additional-info-label">Additional Info Label</Label>
                    <Input
                      id="additional-info-label"
                      value={newTemplate.additionalInfoLabel || ''}
                      onChange={(e) => setNewTemplate({ ...newTemplate, additionalInfoLabel: e.target.value })}
                      placeholder="e.g., Tracking Number"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="additional-info-placeholder">Additional Info Placeholder</Label>
                    <Input
                      id="additional-info-placeholder"
                      value={newTemplate.additionalInfoPlaceholder || ''}
                      onChange={(e) => setNewTemplate({ ...newTemplate, additionalInfoPlaceholder: e.target.value })}
                      placeholder="e.g., Enter tracking number"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-active"
                  checked={newTemplate.isActive}
                  onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, isActive: checked })}
                />
                <Label htmlFor="is-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" onClick={handleCreateTemplate}>Create Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

// Helper function to check for duplicate templates
function hasDuplicateTemplates(templates: Template[]): boolean {
  const templateNames = templates.map(t => t.name);
  const uniqueNames = new Set(templateNames);
  return templateNames.length !== uniqueNames.size;
}
