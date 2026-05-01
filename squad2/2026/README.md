# 2026 — Workspace Nicolas

Diretório de trabalho atual para desenvolvimento e experimentação em 2026.

Esta pasta substitui a antiga pasta pessoal `nicolas/` dentro de `squad2/`, agora
organizada seguindo o padrão de pastas por ano do projeto.

## Estrutura

- `torch-env-check/` — Script de validação do ambiente PyTorch. Verifica a versão
  instalada, checa se o backend MKL-DNN está habilitado e executa uma convolução
  2D de teste para garantir que o Torch está funcional na máquina.

## Uso

```bash
cd torch-env-check
python test_conv.py
```
