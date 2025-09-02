import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, Mail, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSessionContext } from '@/contexts/SessionContext';

export interface ShareMenuProps {
  cid: string;
  name: string;
  type: string;
  isEncrypted?: boolean;
}

export function ShareMenu({ cid, name, type, isEncrypted = false }: ShareMenuProps) {
  const { toast } = useToast();
  const { cid_profile } = useSessionContext();
  const [showCompose, setShowCompose] = useState(false);
  
  const shareUrl = `${window.location.origin}/view/${cid}?name=${encodeURIComponent(name)}`;
  
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copiado al portapapeles',
        description: message,
      });
    });
  };

  const handleCopyLink = () => {
    copyToClipboard(shareUrl, 'Enlace copiado al portapapeles');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Compartir</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyLink}>
            <LinkIcon className="mr-2 h-4 w-4" />
            <span>Copiar enlace</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCompose(true)}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Enviar por Qmail</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showCompose && (
        <QmailComposeModal
          open={showCompose}
          onOpenChange={setShowCompose}
          initialAttachments={[{
            cid,
            name,
            type,
            isEncrypted,
            cid_profile
          }]}
        />
      )}
    </>
  );
}

// Placeholder for missing ComposeEncrypted component
const QmailComposeModal = () => {
  const { toast } = useToast();
  
  React.useEffect(() => {
    toast({
      title: 'Feature not available',
      description: 'The email composition feature is currently not available in this version.',
      variant: 'destructive',
    });
  }, [toast]);
  
  return null;
};

export default ShareMenu;
