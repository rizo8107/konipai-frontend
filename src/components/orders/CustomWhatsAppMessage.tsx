import React, { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MessageSquare, Send, Image, FileVideo, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/types/schema';
import { 
  sendWhatsAppTextMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppVideoMessage,
  sendWhatsAppDocumentMessage,
  uploadFileToPocketBase
} from '@/lib/whatsapp';

interface CustomWhatsAppMessageProps {
  order: Order;
  onMessageSent: () => void;
}

type MessageType = 'text' | 'image' | 'video' | 'document';

export function CustomWhatsAppMessage({ order, onMessageSent }: CustomWhatsAppMessageProps) {
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [message, setMessage] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [preview, setPreview] = useState('');

  // Handle file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFilename(selectedFile.name);
      setMediaUrl(URL.createObjectURL(selectedFile));
      
      // Use filename as caption if no caption is set
      if (!caption) {
        setCaption(selectedFile.name.split('.')[0]);
      }
    }
  };

  // Handle message sending
  const handleSendMessage = async () => {
    setError('');
    setIsSending(true);

    try {
      // Get customer phone number
      const customerPhone = order.customer_phone || '';
      if (!customerPhone) {
        throw new Error('Customer phone number is missing');
      }

      // Format phone number if needed
      const formattedPhone = customerPhone.startsWith('+') ? customerPhone.slice(1) : customerPhone;

      let response;

      switch (messageType) {
        case 'text': {
          if (!message.trim()) {
            throw new Error('Please enter a message');
          }
          response = await sendWhatsAppTextMessage(formattedPhone, message);
          break;
        }

        case 'image':
        case 'video':
        case 'document': {
          if (!file && !mediaUrl) {
            throw new Error(`Please select a ${messageType} to send`);
          }

          // Upload file if it's a new file
          let mediaUrlToUse = mediaUrl;
          if (file) {
            try {
              const uploadedFile = await uploadFileToPocketBase(file);
              mediaUrlToUse = uploadedFile.url;
            } catch (uploadError) {
              console.error('Error uploading file:', uploadError);
              throw new Error('Failed to upload file');
            }
          }

          // Send media message based on type
          switch (messageType) {
            case 'image':
              response = await sendWhatsAppImageMessage(formattedPhone, mediaUrlToUse, caption);
              break;
            case 'video':
              response = await sendWhatsAppVideoMessage(formattedPhone, mediaUrlToUse, caption);
              break;
            case 'document':
              response = await sendWhatsAppDocumentMessage(formattedPhone, mediaUrlToUse, filename || 'document', caption);
              break;
          }
          break;
        }

        default:
          throw new Error('Invalid message type');
      }

      if (response && response.success) {
        toast.success('WhatsApp message sent successfully');
        // Reset form
        setMessage('');
        setCaption('');
        setFile(null);
        setFilename('');
        setMediaUrl('');
        setPreview('');
        onMessageSent();
      } else {
        throw new Error(response?.message || 'Failed to send WhatsApp message');
      }
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Send Custom Message</h3>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Message Type</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={messageType === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('text')}
            className="flex items-center"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Text
          </Button>
          
          <Button
            type="button"
            variant={messageType === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('image')}
            className="flex items-center"
          >
            <Image className="h-4 w-4 mr-2" />
            Image
          </Button>
          
          <Button
            type="button"
            variant={messageType === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('video')}
            className="flex items-center"
          >
            <FileVideo className="h-4 w-4 mr-2" />
            Video
          </Button>
          
          <Button
            type="button"
            variant={messageType === 'document' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('document')}
            className="flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Document
          </Button>
        </div>
      </div>

      {messageType === 'text' ? (
        <div>
          <Label htmlFor="message">Your Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setPreview(e.target.value);
            }}
            placeholder="Enter your WhatsApp message..."
            className="min-h-[150px]"
          />
          <p className="text-xs text-muted-foreground mt-2">
            You can use *text* for bold formatting and _text_ for italic.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Select {messageType}</Label>
            <Input
              id="file"
              type="file"
              accept={
                messageType === 'image' ? 'image/*' :
                messageType === 'video' ? 'video/*' :
                messageType === 'document' ? '.pdf,.doc,.docx,.txt' : undefined
              }
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          {(messageType === 'image' || messageType === 'video') && mediaUrl && (
            <div>
              {messageType === 'image' ? (
                <img src={mediaUrl} alt="Preview" className="max-w-xs rounded-md" />
              ) : (
                <video src={mediaUrl} controls className="max-w-xs rounded-md" />
              )}
            </div>
          )}

          <div>
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter a caption..."
              className="min-h-[100px]"
            />
          </div>

          {messageType === 'document' && (
            <div>
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename..."
                className="mt-1"
              />
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleSendMessage}
        disabled={isSending}
        className="w-full"
      >
        <Send className="h-4 w-4 mr-2" />
        {isSending ? 'Sending...' : 'Send WhatsApp Message'}
      </Button>
    </Card>
  );
}
