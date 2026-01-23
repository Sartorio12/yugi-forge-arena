import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  rewardFrameUrl?: string | null;
}

export function LevelUpModal({ isOpen, onClose, newLevel, rewardFrameUrl }: LevelUpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-stone-900 to-stone-950 border-amber-500/50">
        <DialogHeader>
          <div className="mx-auto bg-amber-500/20 p-3 rounded-full mb-4 w-fit">
            <Trophy className="w-10 h-10 text-amber-500" />
          </div>
          <DialogTitle className="text-center text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-amber-600">
            LEVEL UP!
          </DialogTitle>
          <DialogDescription className="text-center text-lg text-stone-300">
            Você alcançou o nível <span className="font-bold text-amber-400 text-2xl">{newLevel}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {rewardFrameUrl ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Recompensa Desbloqueada</p>
              <div className="relative w-32 h-32 mx-auto">
                 {/* Preview of the frame - assuming a generic avatar placeholder behind it */}
                 <div className="absolute inset-2 bg-stone-800 rounded-full overflow-hidden flex items-center justify-center">
                    <span className="text-4xl">👤</span>
                 </div>
                 <img 
                    src={rewardFrameUrl} 
                    alt="Frame Reward" 
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                 />
              </div>
              <p className="text-amber-200 font-medium">Nova Moldura de Perfil!</p>
            </div>
          ) : (
            <div className="text-center p-4 bg-stone-800/50 rounded-lg border border-stone-700">
              <p className="text-stone-400">Parabéns pelo seu progresso!</p>
              <p className="text-xs text-stone-500 mt-1">Continue duelando para desbloquear mais recompensas.</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button 
            onClick={onClose}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold border-0"
          >
            Coletar Recompensa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}