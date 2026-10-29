export const STAGES = [
  "Não reivindicado",
  "Reivindicado",
  "Entrando",
  "Pré-Abertura",
  "Cooperando",
  "Fechado",
  "Offline",
];
export const PROGRESS = [0, 25, 50, 75, 100, 100, 100];
export const INTEGRATION = [
  [
    "Assinando",
    [
      "Assinatura",
      "Contrato",
      "Hora da aprovação",
      "Conclusão do contrato",
      "Assinatura do comerciante",
    ],
  ],
  [
    "Pré-abertura",
    [
      "Informações da loja",
      "Informações de qualificação",
      "Informações de entrega",
      "Informações de contato",
      "Informações de parceria",
      "Informações de repasse",
    ],
  ],
  [
    "Aceitação de pedidos",
    ["Método de aceitação do pedido", "Rota de aceitação de pedidos"],
  ],
  ["Cardápio e itens", ["Cardápio", "Itens visíveis", "Pendências"]],
  ["Promoção", ["Campanhas", "Itens promocionais", "Condições"]],
  [
    "Verificação de qualidade",
    ["Validação de cadastro", "Validação de operação", "Pendências"],
  ],
  ["Empresa", ["Razão social", "Documento", "Contato da empresa"]],
];
export const LABELS = {
  code: "Merchant ID",
  name: "Nome da loja",
  contact: "Contato",
  method: "Método de aceitação",
  owner: "Responsável",
  city: "Cidade",
};
