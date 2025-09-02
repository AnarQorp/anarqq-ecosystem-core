
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Users, FileText, Eye } from 'lucide-react';
import { useIdentityStore } from '@/state/identity';
import { 
  getPermissionsByOwner, 
  grantPermissions, 
  revokePermissions, 
  getPermissionsStats,
  QonsentPermission,
  PermissionType,
  ResourceType
} from '@/utils/qonsent/qonsentPermissions';

export default function PermissionsManager() {
  const { activeIdentity } = useIdentityStore();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<QonsentPermission[]>([]);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [stats, setStats] = useState({ totalGranted: 0, byModule: {}, byType: {} });
  
  // Form state
  const [formData, setFormData] = useState({
    resourceId: '',
    resourceType: 'document' as ResourceType,
    resourceName: '',
    grantedToAlias: '',
    grantedToDID: '',
    permissions: [] as PermissionType[],
    moduleOrigin: 'Manual'
  });

  useEffect(() => {
    if (activeIdentity) {
      loadPermissions();
    }
  }, [activeIdentity]);

  const loadPermissions = () => {
    if (!activeIdentity) return;
    
    const userPermissions = getPermissionsByOwner(activeIdentity.did);
    setPermissions(userPermissions);
    
    const permissionsStats = getPermissionsStats(activeIdentity.did);
    setStats(permissionsStats);
    
    console.log(`[Qonsent] Cargados ${userPermissions.length} permisos`);
  };

  const handleGrantPermission = () => {
    if (!activeIdentity) return;
    
    if (!formData.resourceId || !formData.grantedToAlias || formData.permissions.length === 0) {
      toast({
        title: "Error",
        description: "Completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }
    
    const success = grantPermissions(
      formData.resourceId,
      formData.resourceType,
      formData.resourceName || formData.resourceId,
      activeIdentity.did,
      formData.grantedToAlias,
      formData.grantedToDID || formData.grantedToAlias,
      formData.permissions,
      formData.moduleOrigin
    );
    
    if (success) {
      toast({
        title: "Permiso otorgado",
        description: `Permisos concedidos a ${formData.grantedToAlias}`,
      });
      
      setShowGrantForm(false);
      setFormData({
        resourceId: '',
        resourceType: 'document',
        resourceName: '',
        grantedToAlias: '',
        grantedToDID: '',
        permissions: [],
        moduleOrigin: 'Manual'
      });
      loadPermissions();
    } else {
      toast({
        title: "Error",
        description: "No se pudo otorgar el permiso",
        variant: "destructive"
      });
    }
  };

  const handleRevokePermission = (resourceId: string, grantedToDID: string, grantedToAlias: string) => {
    const success = revokePermissions(resourceId, grantedToDID);
    
    if (success) {
      toast({
        title: "Permiso revocado",
        description: `Permisos revocados para ${grantedToAlias}`,
      });
      loadPermissions();
    } else {
      toast({
        title: "Error",
        description: "No se pudo revocar el permiso",
        variant: "destructive"
      });
    }
  };

  const handlePermissionChange = (permission: PermissionType, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  if (!activeIdentity) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-muted-foreground">Inicia sesión para gestionar permisos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Permisos</p>
                <p className="text-2xl font-bold">{stats.totalGranted}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Por Módulos</p>
                <p className="text-lg font-semibold">{Object.keys(stats.byModule).length}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tipos de Recurso</p>
                <p className="text-lg font-semibold">{Object.keys(stats.byType).length}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botón para otorgar nuevo permiso */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Permisos Otorgados</h3>
        <Button onClick={() => setShowGrantForm(!showGrantForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Otorgar Permiso
        </Button>
      </div>

      {/* Formulario para otorgar permisos */}
      {showGrantForm && (
        <Card>
          <CardHeader>
            <CardTitle>Otorgar Nuevo Permiso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">ID del Recurso</label>
                <Input
                  value={formData.resourceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, resourceId: e.target.value }))}
                  placeholder="ej: document_123 o file_abc"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Tipo de Recurso</label>
                <Select value={formData.resourceType} onValueChange={(value: ResourceType) => 
                  setFormData(prev => ({ ...prev, resourceType: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Documento</SelectItem>
                    <SelectItem value="image">Imagen</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="message">Mensaje</SelectItem>
                    <SelectItem value="file">Archivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Nombre del Recurso</label>
                <Input
                  value={formData.resourceName}
                  onChange={(e) => setFormData(prev => ({ ...prev, resourceName: e.target.value }))}
                  placeholder="Nombre descriptivo"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Alias del Usuario</label>
                <Input
                  value={formData.grantedToAlias}
                  onChange={(e) => setFormData(prev => ({ ...prev, grantedToAlias: e.target.value }))}
                  placeholder="alias_usuario"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Permisos</label>
              <div className="flex flex-wrap gap-4">
                {(['read', 'download', 'share', 'comment'] as PermissionType[]).map(permission => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={formData.permissions.includes(permission)}
                      onCheckedChange={(checked) => handlePermissionChange(permission, checked as boolean)}
                    />
                    <label htmlFor={permission} className="text-sm capitalize">
                      {permission === 'read' ? 'Lectura' : 
                       permission === 'download' ? 'Descarga' :
                       permission === 'share' ? 'Compartir' : 'Comentar'}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleGrantPermission}>
                Otorgar Permiso
              </Button>
              <Button variant="outline" onClick={() => setShowGrantForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de permisos */}
      <Card>
        <CardHeader>
          <CardTitle>Permisos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                No has otorgado permisos aún. Usa el botón "Otorgar Permiso" para comenzar.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {permissions.map((permission, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{permission.resourceType}</Badge>
                        <Badge variant="secondary">{permission.moduleOrigin}</Badge>
                      </div>
                      <p className="font-semibold">{permission.resourceName}</p>
                      <p className="text-sm text-muted-foreground">
                        Recurso: {permission.resourceId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Usuario: <strong>{permission.grantedToAlias}</strong>
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {permission.permissions.map(perm => (
                          <Badge key={perm} variant="default" className="text-xs">
                            {perm === 'read' ? 'Lectura' : 
                             perm === 'download' ? 'Descarga' :
                             perm === 'share' ? 'Compartir' : 'Comentar'}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokePermission(
                          permission.resourceId, 
                          permission.grantedToDID, 
                          permission.grantedToAlias
                        )}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Revocar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
