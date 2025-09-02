
import React, { useState } from "react";
import { getFile } from "@/utils/ipfs";
import { decryptFile, importKey } from "@/utils/encryption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileMeta {
  name?: string;
  size: number;
  type: string;
  date?: string;
}

// Utilidad para leer ArrayBuffer a texto (si es posible)
function arrayBufferToText(buffer: ArrayBuffer): string | null {
  try {
    return new TextDecoder("utf-8").decode(buffer);
  } catch {
    return null;
  }
}

export default function IPFSRecover() {
  const [hash, setHash] = useState("");
  const [status, setStatus] = useState<null | string>(null);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [isBinary, setIsBinary] = useState(false);
  const [decFileName, setDecFileName] = useState<string | null>(null);

  // MOCK key input: en el futuro esto vendrá de usuario/sistema
  const [aesKey, setAesKey] = useState<string>("");

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Descargando desde IPFS...");
    setMeta(null);
    setFileUrl(null);
    setFileText(null);
    setIsBinary(false);

    try {
      // Descargar el archivo cifrado desde IPFS
      const blob = await getFile(hash);

      setStatus("Archivo descargado. Descifrando...");

      // Obtener metadatos (nombre original no disponible por IPFS estándar)
      const meta: FileMeta = {
        name: "ArchivoDescifrado",
        size: blob.size,
        type: blob.type || "application/octet-stream",
        date: new Date().toLocaleString(),
      };

      // Pide la clave en base64 (mock: input simple)
      if (!aesKey) {
        setStatus("Se requiere una clave AES (Base64/Raw).");
        return;
      }

      // Convertir la clave en base64 a ArrayBuffer
      const keyBuffer = Uint8Array.from(atob(aesKey), c => c.charCodeAt(0)).buffer;
      const cryptoKey = await importKey(keyBuffer);

      // Leer IV y ciphertext. Suposición: los primeros 12 bytes = IV, resto = datos (ajusta según tu flujo)
      const ab = await blob.arrayBuffer();
      const iv = new Uint8Array(ab.slice(0, 12)); // 12 bytes para AES-GCM
      const ciphertext = ab.slice(12);

      // Descifrar
      const plainBuffer = await decryptFile(ciphertext, cryptoKey, iv);

      // Comprobar si es texto
      const asText = arrayBufferToText(plainBuffer);
      if (asText && /^[\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]*$/.test(asText)) {
        setFileText(asText);
        setIsBinary(false);
      } else {
        setFileUrl(URL.createObjectURL(new Blob([plainBuffer])));
        setIsBinary(true);
      }

      setMeta(meta);
      setDecFileName(meta.name || "ArchivoDescifrado");
      setStatus("¡Recuperado y descifrado!");
    } catch (err: any) {
      setStatus("⚠️ Error: " + (err?.message || "No se pudo recuperar o descifrar el archivo."));
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-8 p-6 border rounded-lg shadow bg-background">
      <h1 className="text-2xl font-bold mb-4">Recuperar archivo desde IPFS + Qlock</h1>
      <form onSubmit={handleRecover} className="space-y-4">
        <div>
          <Label htmlFor="hash">Hash (CID) de IPFS</Label>
          <Input
            id="hash"
            type="text"
            value={hash}
            onChange={e => setHash(e.target.value.trim())}
            required
            placeholder="pe. Qmb123... o bafy..."
          />
        </div>
        <div>
          <Label htmlFor="key">Clave AES descifrado (Base64, 32 bytes)</Label>
          <Input
            id="key"
            type="text"
            value={aesKey}
            onChange={e => setAesKey(e.target.value.trim())}
            required
            placeholder="Clave AES exportada en Base64"
          />
        </div>
        <Button type="submit" className="w-full">Recuperar y descifrar</Button>
      </form>

      {status && <p className="mt-4 text-sm">{status}</p>}

      {meta && (
        <div className="mt-6 bg-muted p-4 rounded">
          <h3 className="font-semibold mb-2">Metadatos del archivo</h3>
          <ul className="text-sm space-y-1">
            <li><b>Nombre:</b> {decFileName}</li>
            <li><b>Tamaño:</b> {meta.size} bytes</li>
            <li><b>MIME type:</b> {meta.type}</li>
            <li><b>Recuperado:</b> {meta.date}</li>
          </ul>
        </div>
      )}

      {fileText && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Contenido del archivo:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-x-auto max-h-64 whitespace-pre-wrap">{fileText}</pre>
        </div>
      )}

      {isBinary && fileUrl && (
        <div className="mt-6">
          <Button asChild variant="outline">
            <a href={fileUrl} download={decFileName}>Descargar archivo desencriptado</a>
          </Button>
        </div>
      )}
    </div>
  );
}
