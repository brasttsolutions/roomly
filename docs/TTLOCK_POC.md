# POC física TTLock

Este gate precisa de uma fechadura, teclado e gateway reais. Não declare acesso pronto antes de concluir todos os itens.

| Cenário                          | Evidência esperada                                         |
| -------------------------------- | ---------------------------------------------------------- |
| Criar código temporário          | Código funciona somente entre `valid_from` e `valid_until` |
| Código antes ou depois da janela | Acesso recusado sem depender do backend                    |
| Revogação pela API               | Acesso recusado após sincronização comprovada              |
| Gateway offline                  | Estado vira falha/retry e alerta é emitido                 |
| Internet desconectada            | Comportamento offline documentado pela medição             |
| Backend indisponível             | Código já sincronizado mantém a janela correta             |
| Timeout após escrita             | Reconciliação encontra o código sem duplicá-lo             |
| Timeout sem escrita              | Reconciliação retorna ausente antes de nova criação        |
| Resposta ambígua                 | Operação vai para revisão manual                           |

Anexe timestamps, IDs externos, logs estruturados e vídeo da abertura/recusa. Registre limites do provedor e o procedimento manual de recuperação.
