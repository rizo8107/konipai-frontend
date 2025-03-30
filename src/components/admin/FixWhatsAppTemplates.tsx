import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { removeDuplicateTemplates, ensureOrderDeliveredTemplateHasFeedbackLink } from "@/lib/whatsapp-template-manager.ts";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface FixWhatsAppTemplatesProps {
  onTemplatesFixed?: () => void;
}

export function FixWhatsAppTemplates({ onTemplatesFixed }: FixWhatsAppTemplatesProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    removed: number;
    feedbackFixed: boolean;
    message: string;
  } | null>(null);
  const { toast } = useToast();

  const handleFixTemplates = async () => {
    setIsFixing(true);
    setResult(null);

    try {
      // First remove duplicate templates
      const removedCount = await removeDuplicateTemplates();
      
      // Then fix the ORDER_DELIVERED template
      const feedbackFixed = await ensureOrderDeliveredTemplateHasFeedbackLink();
      
      // Set result
      const resultData = {
        success: true,
        removed: removedCount,
        feedbackFixed,
        message: `Fixed ${removedCount} duplicate templates and ${feedbackFixed ? 'repaired' : 'verified'} feedback link template.`
      };
      
      setResult(resultData);
      toast({
        title: "Templates Fixed",
        description: resultData.message
      });
      
      // Call onTemplatesFixed if provided
      if (onTemplatesFixed) {
        onTemplatesFixed();
      }
    } catch (error) {
      console.error('Error fixing WhatsApp templates:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult({
        success: false,
        removed: 0,
        feedbackFixed: false,
        message: `Failed to fix templates: ${errorMessage}`
      });
      
      toast({
        title: "Error",
        description: `Failed to fix templates: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fix WhatsApp Templates</CardTitle>
        <CardDescription>
          Resolve issues with duplicate templates and ensure the feedback link is correctly configured
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{result.success ? "Templates Fixed" : "Error"}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <p>This tool will:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Remove duplicate WhatsApp templates</li>
            <li>Ensure the ORDER_DELIVERED template has the feedback link variable</li>
            <li>Fix template configurations to prevent UI errors</li>
          </ul>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleFixTemplates} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fixing Templates...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Fix WhatsApp Templates
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 