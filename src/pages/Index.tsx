import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Mail, Lock, Database, Users, FileText, Eye, Key } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const modules = [
    {
      id: "squid",
      name: "sQuid",
      description: "Sistema de identidades descentralizadas",
      icon: <Users className="h-6 w-6" />,
      color: "from-blue-500 to-purple-600",
      href: "/squid-identity",
      status: "active"
    },
    {
      id: "qmail",
      name: "QMail",
      description: "Correo electrónico cifrado punto a punto",
      icon: <Mail className="h-6 w-6" />,
      color: "from-green-500 to-blue-500",
      href: "/inbox",
      status: "active"
    },
    {
      id: "qlock",
      name: "QLock",
      description: "Cifrado cuántico avanzado",
      icon: <Lock className="h-6 w-6" />,
      color: "from-purple-500 to-pink-500",
      href: "/qlock",
      status: "active"
    },
    {
      id: "qindex",
      name: "QIndex",
      description: "Índice descentralizado de archivos",
      icon: <Database className="h-6 w-6" />,
      color: "from-orange-500 to-red-500",
      href: "/qindex",
      status: "active"
    },
    {
      id: "qonsent",
      name: "QOnsent",
      description: "Control de privacidad y consentimiento",
      icon: <Eye className="h-6 w-6" />,
      color: "from-teal-500 to-green-500",
      href: "/config",
      status: "beta"
    },
    {
      id: "qerberos",
      name: "QErberos",
      description: "Autenticación y control de acceso",
      icon: <Key className="h-6 w-6" />,
      color: "from-red-500 to-pink-500",
      href: "#",
      status: "coming_soon"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Activo</Badge>;
      case "beta":
        return <Badge variant="secondary">Beta</Badge>;
      case "coming_soon":
        return <Badge variant="outline">Próximamente</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 to-cyan-800/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
                Anar<span className="text-purple-400">Q&Q</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                Ecosistema de comunicación cuántica descentralizada. 
                Privacidad, soberanía digital y resistencia cuántica.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/squid-identity">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3">
                  <Shield className="mr-2 h-5 w-5" />
                  Acceder con sQuid
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3">
                  Ver Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Módulos del Ecosistema</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Conjunto integrado de herramientas para comunicación segura y privacidad digital
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Card key={module.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-200 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${module.color}`}>
                    {module.icon}
                  </div>
                  {getStatusBadge(module.status)}
                </div>
                <CardTitle className="text-white">{module.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {module.status === "coming_soon" ? (
                  <Button disabled className="w-full">
                    Próximamente
                  </Button>
                ) : (
                  <Link to={module.href} className="block">
                    <Button className="w-full" variant="outline">
                      Acceder
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <p className="text-gray-400">
              AnarQ&Q © 2024 - Sistema de comunicación cuántica descentralizada
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500">
              <span>Privacidad Total</span>
              <span>•</span>
              <span>Código Abierto</span>
              <span>•</span>
              <span>Resistente Cuántico</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
