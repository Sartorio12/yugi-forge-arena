import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function AbsenceRuleNotice() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already acknowledged the rule
    const hasAcknowledged = localStorage.getItem("absence_rule_v1_acknowledged");
    if (!hasAcknowledged) {
      setIsOpen(true);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem("absence_rule_v1_acknowledged", "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-amber-500/50 bg-black/95 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold">Nova Regra de Ausência (W.O.)</DialogTitle>
          </div>
          <DialogDescription className="text-gray-300 pt-2 text-base leading-relaxed">
            Para garantir a qualidade dos torneios, implementamos um novo sistema automático de penalidade:
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-2">
          <div className="bg-amber-950/30 p-4 rounded-md border border-amber-900/50">
            <ul className="list-disc pl-5 space-y-2 text-gray-200">
              <li>
                <span className="font-semibold text-amber-400">Check-in Obrigatório:</span> A falta de check-in resulta em uma falta ("Miss").
              </li>
              <li>
                <span className="font-semibold text-red-400">Bloqueio Automático:</span> Acumular <span className="font-bold text-white">3 faltas consecutivas</span> bloqueia automaticamente sua inscrição em qualquer torneio por <span className="font-bold text-white">7 dias</span>.
              </li>
            </ul>
          </div>
          <p className="text-sm text-gray-400 italic">
            Mantenha seu compromisso com a comunidade e evite penalidades.
          </p>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button 
            onClick={handleAcknowledge}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
