import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { sendEmailMessage, isValidEmail } from "@/lib/email-direct";

interface EmailSenderProps {
  defaultSubject?: string;
  defaultMessage?: string;
}

export function EmailSender({ defaultSubject = "", defaultMessage = "" }: EmailSenderProps) {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendEmail = async () => {
    // Validate email
    if (!recipient || !isValidEmail(recipient)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Validate subject and message
    if (!subject.trim()) {
      toast({
        title: "Missing subject",
        description: "Please enter an email subject.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Missing message",
        description: "Please enter an email message.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Send the email directly using EmailJS
      const result = await sendEmailMessage(recipient, subject, message);

      if (result.success) {
        toast({
          title: "Email sent",
          description: "Your email has been sent successfully.",
          variant: "default",
        });
        
        // Reset form after successful send
        setRecipient("");
        setSubject("");
        setMessage("");
      } else {
        toast({
          title: "Failed to send email",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Send Email</CardTitle>
        <CardDescription>
          Send an email directly from the browser using EmailJS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient</Label>
          <Input
            id="recipient"
            type="email"
            placeholder="recipient@example.com"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="resize-none"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSendEmail} 
          disabled={isSending}
          className="w-full"
        >
          {isSending ? "Sending..." : "Send Email"}
        </Button>
      </CardFooter>
    </Card>
  );
} 