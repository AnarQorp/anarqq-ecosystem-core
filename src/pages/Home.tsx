
/**
 * Home - Panel principal del ecosistema AnarQ & Q
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  MessageCircle, 
  FolderOpen, 
  Image, 
  Wallet, 
  Settings,
  ArrowRight,
  Shield,
  Globe
} from 'lucide-react';
import IdentityDisplay from '@/components/identity/IdentityDisplay';

const modules = [
  {
    id: 'qmail',
    name: 'QMail',
    description: 'Sistema de correo descentralizado con cifrado cuántico',
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    route: '/qmail',
    features: ['Cifrado E2E', 'Firmas digitales', 'Archivos adjuntos']
  },
  {
    id: 'qchat',
    name: 'QChat',
    description: 'Chat P2P en tiempo real resistente a censura',
    icon: MessageCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    route: '/qchat',
    features: ['P2P directo', 'Salas privadas', 'Mensajería grupal']
  },
  {
    id: 'qdrive',
    name: 'QDrive',
    description: 'Almacenamiento descentralizado seguro en IPFS',
    icon: FolderOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    route: '/qdrive',
    features: ['IPFS nativo', 'Versionado', 'Compartición segura']
  },
  {
    id: 'qpic',
    name: 'QPic',
    description: 'Galería multimedia descentralizada',
    icon: Image,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    route: '/qpic',
    features: ['Imágenes/Video', 'Álbumes privados', 'Streaming P2P']
  },
  {
    id: 'qwallet',
    name: 'QWallet',
    description: 'Cartera de identidad digital y criptomonedas',
    icon: Wallet,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    route: '/qwallet',
    features: ['Gestión DID', 'Pi Network', 'Firmas blockchain']
  },
  {
    id: 'qonsent',
    name: 'Qonsent',
    description: 'Gestión de permisos y privacidad',
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    route: '/qonsent',
    features: ['Control granular', 'Auditoría', 'GDPR compliant']
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-slate-900">AnarQ & Q</h1>
              <p className="text-slate-600">Ecosistema Descentralizado</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-purple-600 mb-6">
            <Globe className="h-4 w-4" />
            <span>Conectado a IPFS Real • Storacha Network</span>
          </div>
        </div>

        {/* Identity Display */}
        <div className="max-w-md mx-auto mb-12">
          <IdentityDisplay />
        </div>

        {/* Modules Grid */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
            Módulos del Ecosistema
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Card 
                key={module.id} 
                className={`hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border ${module.borderColor}`}
              >
                <CardHeader>
                  <div className={`w-14 h-14 rounded-xl ${module.bgColor} flex items-center justify-center mb-4 border ${module.borderColor}`}>
                    <module.icon className={`h-7 w-7 ${module.color}`} />
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    <span>{module.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Activo
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    {module.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Link to={module.route}>
                    <Button className="w-full" variant="outline">
                      Acceder
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-semibold text-green-800 mb-2">✅ Sistema Operativo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-700">
                  <div>🔐 Qlock: Activo</div>
                  <div>📋 Qindex: Registrando</div>
                  <div>🛡️ Qerberos: Monitoreando</div>
                  <div>🌐 IPFS: Conectado</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
