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
import { MessageSquare, Edit, Trash2, Plus, Save, X, CheckCircle2 } from 'lucide-react';
import { WhatsAppTemplate } from '@/lib/whatsapp';
import { useWhatsAppTemplates, Template } from '@/hooks/useWhatsAppTemplates';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { generateTemplateContent, generateTemplateDescription } from '@/lib/gemini';

export default function WhatsAppTemplatesPage() {
  const { templates, isLoading, updateTemplate, createTemplate, deleteTemplate } = useWhatsAppTemplates();
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
  const generateTemplate = async () => {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p>Loading templates...</p>
          ) : filteredTemplates.length === 0 ? (
            <p>No templates found. Create your first template to get started.</p>
          ) : (
            filteredTemplates.map((template) => (
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
                <CardFooter className="pt-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <div className="flex items-center">
                      {template.isActive ? (
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 mr-1 text-gray-400" />
                      )}
                      {template.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
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
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription>
                Create a new WhatsApp message template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Template Name</Label>
                <Input
                  id="new-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="e.g., order_confirmation"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-description">Description</Label>
                <Input
                  id="new-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="e.g., Sent when an order is confirmed"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-content">Template Content</Label>
                <div className="flex items-start">
                  <Textarea
                    id="new-content"
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
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
                              <CommandItem key={variable.name} onSelect={() => insertVariable('new-content', variable.name)}>
                                <span className="font-medium">{`{{${variable.name}}}`}</span>
                                <span className="text-xs text-muted-foreground ml-2">{variable.description}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="ml-2 flex items-center gap-2" 
                        onClick={(e) => {
                          e.preventDefault(); // Prevent triggering popover
                          generateTemplate();
                        }}
                        disabled={isGenerating || !newTemplate.name}
                      >
                        {isGenerating ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 16a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 20"></path><path d="M16 16h5v5"></path><path d="M21 8 19 10l-2-2"></path><path d="M3 16l2-2 2 2"></path></svg>
                            <span>Generate with AI</span>
                          </>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-4" align="start">
                      <div className="space-y-2">
                        <h4 className="font-medium">AI Template Generation</h4>
                        <p className="text-sm text-muted-foreground">Generate a template using AI based on the template name.</p>
                        <Button 
                          className="w-full" 
                          onClick={generateTemplate}
                          disabled={isGenerating || !newTemplate.name}
                        >
                          {isGenerating ? 'Generating...' : 'Generate Template'}
                        </Button>
                        {generationError && (
                          <p className="text-xs text-red-500">{generationError}</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="new-requiresAdditionalInfo"
                  checked={newTemplate.requiresAdditionalInfo}
                  onCheckedChange={(checked) => setNewTemplate({...newTemplate, requiresAdditionalInfo: checked})}
                />
                <Label htmlFor="new-requiresAdditionalInfo">Requires Additional Information</Label>
              </div>

              {newTemplate.requiresAdditionalInfo && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-additionalInfoLabel">Additional Info Label</Label>
                    <Input
                      id="new-additionalInfoLabel"
                      value={newTemplate.additionalInfoLabel}
                      onChange={(e) => setNewTemplate({...newTemplate, additionalInfoLabel: e.target.value})}
                      placeholder="e.g., Tracking Number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-additionalInfoPlaceholder">Additional Info Placeholder</Label>
                    <Input
                      id="new-additionalInfoPlaceholder"
                      value={newTemplate.additionalInfoPlaceholder}
                      onChange={(e) => setNewTemplate({...newTemplate, additionalInfoPlaceholder: e.target.value})}
                      placeholder="e.g., Enter tracking number"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="new-isActive"
                  checked={newTemplate.isActive}
                  onCheckedChange={(checked) => setNewTemplate({...newTemplate, isActive: checked})}
                />
                <Label htmlFor="new-isActive">Active</Label>
              </div>

              {newTemplate.content && (
                <div className="pt-4">
                  <Label>Preview</Label>
                  <div className="bg-[#0b141a] p-4 mt-2 rounded-md">
                    <div className="bg-[#005c4b] text-white p-3 rounded-lg max-w-[80%] ml-auto whitespace-pre-wrap text-sm">
                      {renderTemplatePreview(newTemplate.content)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTemplate}>Create Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
