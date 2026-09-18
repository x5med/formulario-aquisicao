# 27 Avenidas para Aquisição de Clientes

Formulário do ebook gratuito da X5 Med. O visitante informa nome, e-mail e WhatsApp; Instagram e autorização para outras mensagens pelo WhatsApp são opcionais. O ebook fica disponível para download após o cadastro, e o pedido de envio pelo WhatsApp é registrado para a equipe.

## Captura progressiva

- Nome, e-mail, WhatsApp ou Instagram preenchido já cria um lead parcial no `funil_ganchos` do Metrics. O navegador envia após uma pausa curta, ao sair do campo e ao sair da página.
- Um UUID salvo em `localStorage` por 30 dias identifica o rascunho. Alterações e conclusão atualizam o mesmo lead; uma falha de rede é tentada novamente.
- O aceite opcional de marketing só é enviado na conclusão. O pedido de entrega do ebook é registrado separadamente.
- O formulário mostra a confirmação imediatamente; enquanto o Metrics responde, informa o estado e oferece nova tentativa se necessário. O download é liberado após confirmação do cadastro.

## Desenvolvimento

```bash
npm install
copy .env.example .env.local
npm run dev
```

Configure `METRICS_EBOOK_INGEST_KEY` em `.env.local` e na Vercel. A mesma chave deve estar no backend do Metrics como `AQUISICAO_EBOOK_INGEST_KEY`. Nenhuma chave é enviada ao navegador. O endpoint pode ser substituído por `METRICS_EBOOK_INGEST_URL` para testes locais.

O PDF original está em `public/27-avenidas-aquisicao-clientes.pdf`; a capa exibida na página foi renderizada da primeira página do arquivo.

## Verificação

```bash
npm run typecheck
npm run lint
npm run build
```
