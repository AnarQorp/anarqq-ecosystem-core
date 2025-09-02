import React, { useState, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useSessionContext } from '@/contexts/SessionContext';
import { useIdentityStore } from '@/state/identity';
import { useToast } from '@/hooks/use-toast';
import { QmarketItem, PublishFormData, LICENSE_OPTIONS } from './types';

// UI Components
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';

// Default form values
const DEFAULT_VALUES: PublishFormData = {
  cid: '',
  title: '',
  description: '',
  tags: '',
  price: '',
  license: 'all-rights-reserved',
};

interface QmarketPublisherProps {
  defaultValues?: Partial<PublishFormData>;
  onPublishSuccess?: () => void;
  disabledFields?: (keyof PublishFormData)[];
  additionalData?: {
    fileType?: string;
    fileSize?: number;
    source?: string;
  };
}

export default function QmarketPublisher({
  defaultValues: propDefaultValues,
  onPublishSuccess,
  disabledFields = [],
  additionalData = {}
}: QmarketPublisherProps = {}) {
  const { session, isAuthenticated } = useSessionContext();
  const { activeIdentity } = useIdentityStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge default values with any provided props
  const mergedDefaultValues = useMemo(() => ({
    ...DEFAULT_VALUES,
    ...propDefaultValues,
  }), [propDefaultValues]);

  // Initialize form with react-hook-form
  const form = useForm<PublishFormData>({
    defaultValues: mergedDefaultValues,
  });

  // Handle form submission
  const onSubmit = useCallback(async (data: PublishFormData) => {
    if (!isAuthenticated || !activeIdentity || !session?.cid_profile) {
      toast({
        title: 'Error de autenticación',
        description: 'Debes iniciar sesión para publicar contenido.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the QmarketItem object
      const qmarketItem: QmarketItem = {
        cid: data.cid.trim(),
        publisher: {
          cid_profile: session.cid_profile,
          did: activeIdentity.did,
          name: activeIdentity.name,
        },
        metadata: {
          title: data.title.trim(),
          description: data.description.trim() || undefined,
          tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          license: data.license,
          price: Number(data.price) || 0,
          createdAt: new Date().toISOString(),
        },
        content: {
          type: additionalData.fileType || 'unknown',
          size: additionalData.fileSize || 0,
          source: (additionalData.source as 'qdrive' | 'qpic' | 'external') || 'qdrive',
        },
      };

      // TODO: Upload to IPFS or your preferred storage
      console.log('Publishing item:', qmarketItem);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      toast({
        title: '¡Publicación exitosa!',
        description: 'Tu contenido ha sido publicado en Qmarket.',
      });
      
      // Call the success callback if provided
      if (onPublishSuccess) {
        onPublishSuccess();
      } else {
        // Only reset to default values if not controlled by parent
        form.reset(DEFAULT_VALUES);
      }
      
    } catch (error) {
      console.error('Error publishing to Qmarket:', error);
      toast({
        title: 'Error al publicar',
        description: 'No se pudo publicar el contenido. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, activeIdentity, session, form, toast]);

  // Show not authenticated message if user is not logged in
  if (!isAuthenticated || !session?.cid_profile) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Publicar en Qmarket</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Debes iniciar sesión con tu identidad sQuid para publicar contenido en Qmarket.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Publicar en Qmarket</CardTitle>
        <p className="text-sm text-muted-foreground">
          Publica tu contenido en el mercado descentralizado de AnarQ & Q
        </p>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* CID Input */}
            <FormField
              control={form.control}
              name="cid"
              rules={{
                required: 'El CID del contenido es obligatorio',
                minLength: { value: 10, message: 'El CID debe tener al menos 10 caracteres' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CID del contenido</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" 
                      readOnly={disabledFields.includes('cid')}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    El identificador único del contenido en IPFS (Qm...)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title Input */}
            <FormField
              control={form.control}
              name="title"
              rules={{
                required: 'El título es obligatorio',
                minLength: { value: 3, message: 'El título debe tener al menos 3 caracteres' },
                maxLength: { value: 100, message: 'El título no puede tener más de 100 caracteres' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Título descriptivo de tu contenido" 
                      readOnly={disabledFields.includes('title')}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Input */}
            <FormField
              control={form.control}
              name="description"
              rules={{
                maxLength: { value: 1000, message: 'La descripción no puede tener más de 1000 caracteres' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe tu contenido en detalle..." 
                      className="min-h-[100px]"
                      readOnly={disabledFields.includes('description')}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price Input */}
              <FormField
                control={form.control}
                name="price"
                rules={{
                  min: { value: 0, message: 'El precio no puede ser negativo' },
                  max: { value: 1000000, message: 'El precio es demasiado alto' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio (tokens AQ)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        placeholder="0"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Deja en 0 para ofrecer el contenido de forma gratuita
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* License Select */}
              <FormField
                control={form.control}
                name="license"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Licencia</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una licencia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LICENSE_OPTIONS.map((license) => (
                          <SelectItem key={license.value} value={license.value}>
                            {license.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tags Input */}
            <FormField
              control={form.control}
              name="tags"
              rules={{
                maxLength: { value: 200, message: 'Demasiadas etiquetas' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etiquetas (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="arte, digital, fotografía, ..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Separa las etiquetas con comas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => form.reset(DEFAULT_VALUES)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publicando...' : 'Publicar en Qmarket'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
