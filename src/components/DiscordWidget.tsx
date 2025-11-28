import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export const DiscordWidget = () => {
  // SUBSTITUA PELO ID DO SEU SERVIDOR DISCORD
  // Para pegar o ID: Configurações do Servidor -> Widget -> ID do Servidor
  // Certifique-se de que a opção "Habilitar Widget do Servidor" está marcada.
  const discordServerId = "1219662719888654466"; // Placeholder ID or existing one if known. Using a generic one might break, leaving empty or instruction is better. 
  // I'll use a common placeholder but the user MUST change it.
  // Actually, I'll put a comment and a variable.
  
  // Note: If this ID is invalid, the widget will show an error.
  
  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-primary">
          <MessageSquare className="h-5 w-5" />
          Chat da Comunidade
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        <iframe 
          src={`https://discord.com/widget?id=${discordServerId}&theme=dark`} 
          width="100%" 
          height="500" 
          allowTransparency={true} 
          frameBorder="0" 
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          title="Discord Widget"
          className="bg-transparent"
        ></iframe>
      </CardContent>
    </Card>
  );
};
