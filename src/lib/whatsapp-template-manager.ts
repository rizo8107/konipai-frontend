import { pb } from '@/lib/pocketbase';
import { Template } from '@/hooks/useWhatsAppTemplates';
import { WhatsAppTemplate } from '@/lib/whatsapp';

/**
 * Fetches unique templates from PocketBase removing duplicates
 * @returns Array of deduplicated templates
 */
export async function fetchUniqueTemplates(): Promise<Template[]> {
  try {
    // Get templates from PocketBase
    const records = await pb.collection('whatsapp_templates').getFullList({
      sort: 'name',
    });
    
    // Convert records to Template type
    const allTemplates = records as unknown as Template[];
    
    // Create a map to deduplicate by template name
    const uniqueTemplatesMap = new Map<string, Template>();
    
    // Add templates to map, keeping only the last one for each name
    allTemplates.forEach(template => {
      uniqueTemplatesMap.set(template.name, template);
    });
    
    // Convert map back to array
    return Array.from(uniqueTemplatesMap.values());
  } catch (error) {
    console.error('Error fetching unique templates:', error);
    return [];
  }
}

/**
 * Removes duplicate templates from PocketBase
 * @returns Number of templates removed
 */
export async function removeDuplicateTemplates(): Promise<number> {
  try {
    // Get all templates
    const records = await pb.collection('whatsapp_templates').getFullList({
      sort: 'created', // Sort by creation date to identify duplicates
    });
    
    // Convert records to Template type
    const allTemplates = records as unknown as Template[];
    
    // Create a map to track templates by name
    const templateMap = new Map<string, Template[]>();
    
    // Group templates by name
    allTemplates.forEach(template => {
      if (!templateMap.has(template.name)) {
        templateMap.set(template.name, []);
      }
      templateMap.get(template.name)?.push(template);
    });
    
    // Process each group of templates, keeping only the most recent one
    let removedCount = 0;
    for (const [name, templates] of templateMap.entries()) {
      if (templates.length > 1) {
        // Sort by created date, most recent first
        templates.sort((a, b) => {
          const dateA = a.created ? new Date(a.created).getTime() : 0;
          const dateB = b.created ? new Date(b.created).getTime() : 0;
          return dateB - dateA;
        });
        
        // Keep the most recent one, delete the rest
        const [keep, ...duplicates] = templates;
        
        // Delete duplicates
        for (const dup of duplicates) {
          await pb.collection('whatsapp_templates').delete(dup.id);
          removedCount++;
        }
      }
    }
    
    return removedCount;
  } catch (error) {
    console.error('Error removing duplicate templates:', error);
    return 0;
  }
}

/**
 * Validates variables in a template content and checks for required ones
 * @param templateContent The template content with variables
 * @returns Object with validation results
 */
export function validateTemplateVariables(templateContent: string): {
  allVariables: string[];
  missingVariables: string[];
  isValid: boolean;
} {
  // Regular expression to find all template variables like {{variableName}}
  const regex = /{{([^}]+)}}/g;
  const matches = templateContent.matchAll(regex);
  const variables = new Set<string>();
  
  // Extract all unique variable names
  for (const match of matches) {
    variables.add(match[1]);
  }
  
  // Required variables for different templates
  const requiredVariables = ['customerName', 'orderId'];
  const feedbackLinkVariables = ['feedbackLink'];
  
  // Check if template contains feedbackLink reference
  const needsFeedbackLink = templateContent.includes('{{feedbackLink}}');
  
  // Check for missing required variables
  const missingVariables = [
    ...requiredVariables,
    ...(needsFeedbackLink ? feedbackLinkVariables : [])
  ].filter(v => !variables.has(v));
  
  return {
    allVariables: Array.from(variables),
    missingVariables,
    isValid: missingVariables.length === 0
  };
}

/**
 * Prepare components for WhatsApp templates with correct format for feedback link
 * @param order Order data for template
 * @param feedbackLink URL for feedback
 * @param additionalVariables Any additional variables
 * @returns Properly formatted template components
 */
export function prepareTemplateComponents(
  order: any,
  feedbackLink: string = '',
  additionalVariables: Record<string, string> = {}
): any[] {
  // Prepare base variables
  const variables = {
    customerName: order.customer_name || 'Customer',
    orderId: order.id || 'Unknown',
    ...additionalVariables
  };
  
  // Add feedback link if provided
  if (feedbackLink) {
    variables['feedbackLink'] = feedbackLink;
  }
  
  // Convert to WhatsApp API components format
  const components = [
    {
      type: 'body',
      parameters: Object.entries(variables).map(([key, value]) => ({
        type: 'text',
        text: value
      }))
    }
  ];
  
  return components;
}

/**
 * Creates a new template if it doesn't exist or updates an existing one
 * @param templateData Template data
 * @returns Created or updated template
 */
export async function createOrUpdateTemplate(
  templateData: Omit<Template, 'id' | 'created' | 'updated'>
): Promise<Template> {
  try {
    // Check if template exists with this name
    const existingTemplates = await pb.collection('whatsapp_templates').getList(1, 1, {
      filter: `name = "${templateData.name}"`
    });
    
    if (existingTemplates.items.length > 0) {
      // Update existing template
      const existing = existingTemplates.items[0];
      const updated = await pb.collection('whatsapp_templates').update(
        existing.id, 
        templateData
      );
      return updated as unknown as Template;
    } else {
      // Create new template
      const created = await pb.collection('whatsapp_templates').create(templateData);
      return created as unknown as Template;
    }
  } catch (error) {
    console.error('Error creating or updating template:', error);
    throw error;
  }
}

/**
 * Gets default template content for order delivered message
 * @returns Template content with feedback link variable
 */
export function getOrderDeliveredDefaultTemplate(): string {
  return `📦 *Order Delivered* 📦

Hi {{customerName}},

Your order #{{orderId}} has been delivered!

We hope you love your purchase. Please share your feedback here: {{feedbackLink}}

Thank you for shopping with us!`;
}

/**
 * Checks and fixes the ORDER_DELIVERED template to ensure it has feedbackLink
 */
export async function ensureOrderDeliveredTemplateHasFeedbackLink(): Promise<boolean> {
  try {
    // Get the ORDER_DELIVERED template
    const existingTemplates = await pb.collection('whatsapp_templates').getList(1, 1, {
      filter: `name = "${WhatsAppTemplate.ORDER_DELIVERED}"`
    });
    
    if (existingTemplates.items.length > 0) {
      const template = existingTemplates.items[0] as unknown as Template;
      
      // Check if template has feedbackLink variable
      if (!template.content.includes('{{feedbackLink}}')) {
        // Update template with correct content
        await pb.collection('whatsapp_templates').update(
          template.id, 
          {
            content: getOrderDeliveredDefaultTemplate(),
            requiresAdditionalInfo: true,
            additionalInfoLabel: 'Feedback Link',
            additionalInfoPlaceholder: 'https://example.com/feedback'
          }
        );
        return true;
      }
      return false; // No update needed
    } else {
      // Create template if it doesn't exist
      await pb.collection('whatsapp_templates').create({
        name: WhatsAppTemplate.ORDER_DELIVERED,
        content: getOrderDeliveredDefaultTemplate(),
        requiresAdditionalInfo: true,
        additionalInfoLabel: 'Feedback Link',
        additionalInfoPlaceholder: 'https://example.com/feedback',
        isActive: true,
        description: 'Sent when order is delivered'
      });
      return true;
    }
  } catch (error) {
    console.error('Error ensuring ORDER_DELIVERED template has feedbackLink:', error);
    return false;
  }
} 