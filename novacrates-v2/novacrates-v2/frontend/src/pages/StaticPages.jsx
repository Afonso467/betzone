import { Card, Badge } from '../components/ui';

function ComingSoon({ icon, title, desc, extras = [] }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{icon} {title}</h1>
      </div>
      <Card className="text-center py-16 max-w-lg mx-auto">
        <div className="text-6xl mb-4">{icon}</div>
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-text2 text-sm mb-4 max-w-sm mx-auto">{desc}</p>
        <Badge color="orange">Em Breve</Badge>
        {extras.length > 0 && (
          <div className="mt-6 text-left space-y-2 max-w-xs mx-auto">
            {extras.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-text2">
                <span className="text-orange">→</span> {e}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function Parcerias() {
  return (
    <ComingSoon
      icon="🤝"
      title="Parcerias"
      desc="Programa de parcerias e criadores de conteúdo. Ganha comissões por cada jogador referido."
      extras={[
        'Comissão de 10% por cada depósito referido',
        'Dashboard dedicado com estatísticas',
        'Pagamentos semanais via PayPal ou transferência',
        'Materiais de marketing exclusivos',
      ]}
    />
  );
}

export function Sobre() {
  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">ℹ️ Sobre</h1>
        <p className="text-text2 text-sm mt-1">Sobre a plataforma NovaCrates</p>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange to-orange2 rounded-xl flex items-center justify-center text-2xl">🎮</div>
            <div>
              <div className="font-black text-lg">Nova<span className="text-orange">Crates</span></div>
              <div className="text-text2 text-xs">A plataforma gaming premium</div>
            </div>
          </div>
          <p className="text-text2 text-sm leading-relaxed">
            A NovaCrates é uma plataforma de entretenimento gaming que oferece minigames, sistema de apostas em esports, abertura de caixas de skins e muito mais. Criada para proporcionar a melhor experiência gaming possível.
          </p>
        </Card>
        {[
          { icon:'🎮', title:'Jogos Justos', desc:'Todos os jogos utilizam RNG do servidor verificável. O resultado nunca é manipulado.' },
          { icon:'🔐', title:'Segurança',    desc:'Passwords encriptadas com bcrypt, autenticação JWT e comunicações SSL.' },
          { icon:'⚡', title:'Performance',  desc:'Plataforma optimizada para resposta rápida e experiência fluida.' },
        ].map(f => (
          <Card key={f.title}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <div className="font-bold text-sm mb-1">{f.title}</div>
                <div className="text-text2 text-xs leading-relaxed">{f.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
