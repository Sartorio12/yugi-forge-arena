import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface BannerPreviewAdjustProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onConfirm: (percentage: number) => void;
  initialPercentage?: number;
}

export const BannerPreviewAdjust: React.FC<BannerPreviewAdjustProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onConfirm,
  initialPercentage = 50
}) => {
  const { t } = useTranslation();
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Convert percentage to pixels when image/container is ready
  useEffect(() => {
    if (isOpen && imageRef.current && containerRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const imageHeight = imageRef.current.offsetHeight;
      if (imageHeight > containerHeight) {
        const maxScroll = imageHeight - containerHeight;
        setOffsetY(-(initialPercentage / 100) * maxScroll);
      }
    }
  }, [isOpen, initialPercentage]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY - offsetY);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    let newOffsetY = clientY - startY;

    if (imageRef.current && containerRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const imageHeight = imageRef.current.offsetHeight;
      const maxOffset = 0;
      const minOffset = -(imageHeight - containerHeight);
      
      if (imageHeight > containerHeight) {
        if (newOffsetY > maxOffset) newOffsetY = maxOffset;
        if (newOffsetY < minOffset) newOffsetY = minOffset;
      } else {
        newOffsetY = 0;
      }
    }

    setOffsetY(newOffsetY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, startY]);

  const handleConfirm = () => {
    if (imageRef.current && containerRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const imageHeight = imageRef.current.offsetHeight;
      const maxScroll = imageHeight - containerHeight;
      const percentage = maxScroll > 0 ? (Math.abs(offsetY) / maxScroll) * 100 : 50;
      onConfirm(Math.round(percentage));
    } else {
      onConfirm(50);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('profile_page.edit_modal.banner_adjust_title', 'Ajustar Posição do Banner')}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t('profile_page.edit_modal.banner_adjust_hint', 'Arraste a imagem para cima ou para baixo para ajustar o enquadramento.')}
          </p>
          
          <div 
            ref={containerRef}
            className="w-full aspect-[4/1] bg-black rounded-lg overflow-hidden relative cursor-ns-resize"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt="Preview" 
              className="w-full absolute select-none pointer-events-none"
              style={{ top: `${offsetY}px` }}
              onLoad={() => {
                // Adjust initial offset on load
                if (imageRef.current && containerRef.current) {
                  const containerHeight = containerRef.current.offsetHeight;
                  const imageHeight = imageRef.current.offsetHeight;
                  if (imageHeight > containerHeight) {
                    const maxScroll = imageHeight - containerHeight;
                    setOffsetY(-(initialPercentage / 100) * maxScroll);
                  }
                }
              }}
            />
            <div className="absolute inset-0 border-2 border-primary/50 pointer-events-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('profile_page.edit_modal.cancel')}</Button>
          <Button onClick={handleConfirm}>{t('profile_page.edit_modal.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
