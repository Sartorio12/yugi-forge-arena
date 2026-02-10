import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const SUPER_ADMIN_ID = '80193776-6790-457c-906d-ed45ea16df9f';

export default function CardManagementPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        pt_name: "",
        type: "Effect Monster",
        description: "",
        attribute: "DARK",
        race: "Warrior",
        atk: "0",
        def: "0",
        level: "4",
        image_url: "",
        konami_id: "",
        md_rarity: "Common"
    });

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || user.id !== SUPER_ADMIN_ID) {
                toast({
                    title: "Acesso Negado",
                    description: "Esta área é restrita ao Super Admin.",
                    variant: "destructive"
                });
                navigate("/dashboard/tournaments");
                return;
            }
            setIsLoading(false);
        };
        checkAccess();
    }, [navigate]);

    const insertCardMutation = useMutation({
        mutationFn: async () => {
            // Basic validation
            if (!formData.name || !formData.type || !formData.description) {
                throw new Error("Preencha os campos obrigatórios (Nome, Tipo, Descrição).");
            }

            const konamiId = formData.konami_id || Math.floor(Math.random() * 100000000).toString();
            const cardId = konamiId; // Use same ID for simplicity

            const payload = {
                id: cardId,
                konami_id: konamiId,
                name: formData.name,
                pt_name: formData.pt_name || formData.name,
                type: formData.type,
                description: formData.description,
                attribute: formData.attribute.toUpperCase(),
                race: formData.race,
                atk: formData.atk ? Number(formData.atk) : null,
                def: formData.def ? Number(formData.def) : null,
                level: formData.level ? Number(formData.level) : null,
                image_url: formData.image_url || "/placeholder.svg",
                image_url_small: formData.image_url || "/placeholder.svg",
                md_rarity: formData.md_rarity,
                genesys_points: 0
            };

            const { error } = await supabase.from('cards').upsert(payload);
            if (error) throw error;
            return payload;
        },
        onSuccess: (data) => {
            toast({ 
                title: "Carta Adicionada!", 
                description: `${data.name} foi inserida com sucesso.` 
            });
            // Reset form
            setFormData({
                name: "",
                pt_name: "",
                type: "Effect Monster",
                description: "",
                attribute: "DARK",
                race: "Warrior",
                atk: "0",
                def: "0",
                level: "4",
                image_url: "",
                konami_id: "",
                md_rarity: "Common"
            });
        },
        onError: (err) => {
            toast({ 
                title: "Erro ao inserir", 
                description: err.message, 
                variant: "destructive" 
            });
        }
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <Link to="/dashboard/tournaments">
                <Button variant="ghost" className="mb-8 hover:text-primary transition-all">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao Dashboard
                </Button>
            </Link>

            <Card className="bg-gradient-card border-border shadow-2xl">
                <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <PlusCircle className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Inserção Manual de Cartas</CardTitle>
                            <CardDescription className="font-bold text-xs uppercase tracking-widest text-primary/80">
                                Área Restrita: Super Admin
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex gap-3 items-start">
                        <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-200/80">
                            <p className="font-bold text-yellow-500 mb-1">Atenção</p>
                            Use esta ferramenta apenas para cartas que ainda não existem na API oficial. 
                            Certifique-se de usar um ID único (ou deixe em branco para gerar um aleatório) para evitar sobrescrever cartas existentes.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Nome (Inglês) *</Label>
                            <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ex: Dark Magician" />
                        </div>
                        <div className="space-y-2">
                            <Label>Nome (Português)</Label>
                            <Input value={formData.pt_name} onChange={e => handleChange('pt_name', e.target.value)} placeholder="Ex: Mago Negro" />
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo de Carta *</Label>
                            <Select value={formData.type} onValueChange={val => handleChange('type', val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Normal Monster">Normal Monster</SelectItem>
                                    <SelectItem value="Effect Monster">Effect Monster</SelectItem>
                                    <SelectItem value="Spell Card">Spell Card</SelectItem>
                                    <SelectItem value="Trap Card">Trap Card</SelectItem>
                                    <SelectItem value="Fusion Monster">Fusion Monster</SelectItem>
                                    <SelectItem value="Synchro Monster">Synchro Monster</SelectItem>
                                    <SelectItem value="Xyz Monster">Xyz Monster</SelectItem>
                                    <SelectItem value="Link Monster">Link Monster</SelectItem>
                                    <SelectItem value="Ritual Monster">Ritual Monster</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Atributo</Label>
                            <Select value={formData.attribute} onValueChange={val => handleChange('attribute', val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DARK">DARK</SelectItem>
                                    <SelectItem value="LIGHT">LIGHT</SelectItem>
                                    <SelectItem value="EARTH">EARTH</SelectItem>
                                    <SelectItem value="WATER">WATER</SelectItem>
                                    <SelectItem value="FIRE">FIRE</SelectItem>
                                    <SelectItem value="WIND">WIND</SelectItem>
                                    <SelectItem value="DIVINE">DIVINE</SelectItem>
                                    <SelectItem value="SPELL">SPELL (Magia)</SelectItem>
                                    <SelectItem value="TRAP">TRAP (Armadilha)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Raça / Tipo</Label>
                            <Input value={formData.race} onChange={e => handleChange('race', e.target.value)} placeholder="Ex: Dragon, Warrior, Field..." />
                        </div>

                         <div className="space-y-2">
                            <Label>Konami ID / Passcode</Label>
                            <Input value={formData.konami_id} onChange={e => handleChange('konami_id', e.target.value)} placeholder="Opcional: ID Oficial (ex: 46986414)" />
                        </div>

                        <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>ATK</Label>
                                <Input type="number" value={formData.atk} onChange={e => handleChange('atk', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>DEF / Link Rating</Label>
                                <Input value={formData.def} onChange={e => handleChange('def', e.target.value)} placeholder="Numérico ou 0" />
                            </div>
                            <div className="space-y-2">
                                <Label>Level / Rank</Label>
                                <Input type="number" value={formData.level} onChange={e => handleChange('level', e.target.value)} />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label>Descrição / Efeito *</Label>
                            <Textarea 
                                value={formData.description} 
                                onChange={e => handleChange('description', e.target.value)} 
                                className="h-32 font-mono text-xs" 
                                placeholder="Texto completo do efeito..."
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label>URL da Imagem</Label>
                            <Input value={formData.image_url} onChange={e => handleChange('image_url', e.target.value)} placeholder="https://..." />
                            <p className="text-[10px] text-muted-foreground">Recomendado colocar a imagem na pasta /public/cards e usar o caminho relativo (ex: /cards/minha-carta.jpg)</p>
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="flex justify-end">
                        <Button 
                            size="lg" 
                            className="bg-green-600 hover:bg-green-500 font-bold text-lg px-8 shadow-lg shadow-green-900/20"
                            onClick={() => insertCardMutation.mutate()}
                            disabled={insertCardMutation.isPending}
                        >
                            {insertCardMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                            Inserir Carta
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
