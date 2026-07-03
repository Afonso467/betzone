import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from '../components/ui';
import { formatPoints, formatNumber } from '../utils/constants';
import { useApi } from '../hooks/useApi';
import api from '../utils/api';

export default function Inventory() {
  const { refresh } = useAuth();
  const { data: invData, mutate } = useApi('/store/inventory');
  const [localInventory, setLocalInventory] = useState([]);

  useEffect(() => {
    if (invData?.inventory) {
      setLocalInventory(invData.inventory);
    }
  }, [invData]);

  const sellItem = async (item) => {
    const sellValue = Math.round((item.points_value || 0) * 0.85);
    // Otimismo visual: remove logo do ecrã localmente antes do await terminar
    const updated = localInventory.filter(i => i.inventory_id !== item.inventory_id);
    setLocalInventory(updated);
    if (invData) mutate({ ...invData, inventory: updated }, false);

    try {
      await api.post('/skins/sell', { inventoryId: item.inventory_id });
      toast.success(`Vendido por ${formatNumber(sellValue)} pts!`);
      await refresh();
    } catch (err) {
      // Rollback se falhar
      setLocalInventory(localInventory);
      if (invData) mutate(invData, false);
      toast.error(err.response?.data?.error || 'Erro ao vender');
    }
  };

  const sellAll = async () => {
    if (localInventory.length === 0) return;
    
    // Calcula o valor total estimado para o feedback visual
    const totalEst = localInventory.reduce((acc, curr) => acc + Math.round((curr.points_value || 0) * 0.85), 0);
    
    // Limpa o ecrã instantaneamente
    setLocalInventory([]);
    if (invData) mutate({ ...invData, inventory: [] }, false);

    try {
      // Vende todos sequencialmente ou via endpoint próprio (se suportado pelo backend)
      // Usando promessas paralelas para limpar o inventário
      await Promise.all(
        localInventory.map(item => api.post('/skins/sell', { inventoryId: item.inventory_id }))
      );
      toast.success(`🎉 Todos os itens foram vendidos por ~${formatNumber(totalEst)} pts!`);
      await refresh();
    } catch (err) {
      // Restaura o inventário em caso de falha generalizada
      if (invData) mutate();
      toast.error('Erro ao processar a venda de alguns itens.');
      await refresh();
    }
  };

  // Helper para renderizar o ícone (Emoji ou Imagem URL)
  const renderIcon = (item) => {
    const isUrl = item.emoji && (item.emoji.startsWith('http://') || item.emoji.startsWith('https://') || item.emoji.startsWith('/'));
    if (isUrl) {
      return <img src={item.emoji} alt={item.name} className="w-10 h-10 object-contain mx-auto mb-1" />;
    }
    return <div className="text-3xl mb-1">{item.emoji || '🔫'}</div>;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">🎒 O Meu Inventário</h1>
          <p className="text-text2 text-sm mt-1">Gere e vende os te’us itens obtidos</p>
        </div>
        {localInventory.length > 0 && (
          <Button onClick={sellAll} variant="danger" className="bg-red-600 hover:bg-red-700 font-bold px-4 py-2">
            💥 Vender Tudo ({localInventory.length} itens)
          </Button>
        )}
      </div>

      <Card>
        {localInventory.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-2">📦</span>
            <p className="text-text3 text-sm">O teu inventário está completamente vazio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {localInventory.map((item, i) => {
              const sellValue = Math.round((item.points_value || 0) * 0.85);
              return (
                <div key={item.inventory_id || i} className="bg-bg4 border border-border rounded-[12px] p-3 text-center flex flex-col justify-between transition-transform hover:scale-[1.02]">
                  <div>
                    {renderIcon(item)}
                    <div className="text-xs font-bold truncate mt-1" title={item.name}>{item.name}</div>
                    <div className="text-[10px] text-text2 uppercase tracking-wider font-semibold">{item.wear || 'Factory New'}</div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-blue font-black">{formatNumber(item.points_value)} pts</div>
                    <button
                      onClick={() => sellItem(item)}
                      className="w-full py-1.5 rounded-lg text-[10px] font-black bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
                    >
                      Vender ({formatNumber(sellValue)})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}