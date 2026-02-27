# Guia de Execução - Migração de Categorias

## 🎯 Objetivo

Corrigir todas as categorias antigas para as novas categorias padronizadas:
- ❌ `MANEJO DE NUTRIENTES E AGUA`
- ❌ `BIOINSUMOS`
- ❌ `MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE`

↓

- ✅ `solos`
- ✅ `citros e cana`

## 📋 Pré-requisitos

1. **Arquivo Python rodando** (API de categorização)
   ```bash
   cd api-cientometria
   python -m uvicorn src.utils.llm:app --port 8000
   ```

2. **API Groq configurada**
   ```bash
   export GROQ_API_KEY="sua-chave-aqui"
   ```

3. **Arquivo consolidado**: `Consolidado - Respostas Gerais.xlsx`

## 🚀 Execução

### Opção 1: Migração Completa (Recomendado)

```bash
cd api-cientometria
node scripts/migrate_categories.js
```

**O que faz:**
- ✓ Identifica 50 primeiros artigos com categorias inválidas
- ✓ Tenta recategorizar via API Groq/LLM
- ✓ Aplica mapeamentos automáticos para antigos
- ✓ Cria backup automático: `Consolidado - Respostas Gerais_backup_TIMESTAMP.xlsx`
- ✓ Atualiza arquivo original com novas categorias

**Tempo estimado:** 5-15 minutos (depende de quantidade de artigos inválidos)

### Opção 2: Migração Automática (Via System)

A migração ocorre automaticamente quando o sistema carrega dados:

```bash
# No servidor rodando, simular carga:
curl http://localhost:3000/api/curation \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Validação

### Verificar Categorias Após Migração

```bash
# Exigir autenticação local
node -e "
const xlsx = require('xlsx');
const wb = xlsx.readFile('Consolidado - Respostas Gerais.xlsx');
const ws = wb.Sheets['Tabela completa'];
const data = xlsx.utils.sheet_to_aoa(ws);
const headers = data[0];
const colIdx = headers.indexOf('CATEGORIA');

let valid = 0, invalid = 0, empty = 0;
for (let i = 1; i < data.length; i++) {
  const cat = String(data[i][colIdx] || '').trim();
  if (cat === '') empty++;
  else if (['solos', 'citros e cana'].includes(cat)) valid++;
  else { 
    invalid++; 
    console.log('⚠️ Linha ' + (i+1) + ': ' + cat);
  }
}
console.log('✓ Válidas: ' + valid);
console.log('⚠ Inválidas: ' + invalid);
console.log('- Vazias: ' + empty);
"
```

### Verificar Usuários Permissões

```sql
SELECT id, username, role, allowed_categories FROM users;
```

**Esperado:**
- `curadoria_solos` → `["solos"]`
- `curadoria_citros_cana` → `["citros e cana"]`
- `admin`/`cientometria` → `null` (acesso completo)

## 🔧 Troubleshooting

### Erro: "Categorization API Error"

```
✗ Erro na API de categorização: connect ECONNREFUSED
```

**Solução:** Verificar se API Python está rodando
```bash
curl http://localhost:8000/
```

### Erro: "Rate Limited by Groq"

```
429 Too Many Requests
```

**Solução:** 
- Aguardar alguns minutos
- Executar novamente: `node scripts/migrate_categories.js`
- Ou usar modo manual com mapeamentos

### Arquivo fica muito grande após backup

**Solução:** Deletar backups antigos
```bash
rm Consolidado*_backup_*.xlsx
```

## 📁 Arquivos Modificados

- ✅ `src/utils/llm.py` - Endpoint `/categorize` melhorado
- ✅ `src/services/api_logic.js` - Mapeamento automático de categorias
- ✅ `scripts/migrate_categories.js` - Script de migração (novo)
- ✅ `CATEGORY_MIGRATION.md` - Documentação (novo)

## 🎓 Próximos Passos

### 1. Monitorar Logs

```bash
tail -f llm.log  # Logs da API Python
pm2 logs api-ciento  # Logs do servidor Node
```

### 2. Validar Frontend

- [ ] Login como `curadoria_solos`
- [ ] Verificar se vê apenas artigos da categoria `solos`
- [ ] Login como `curadoria_citros_cana`
- [ ] Verificar se vê apenas artigos de `citros e cana`
- [ ] Login como `admin`
- [ ] Verificar se vê todos os artigos

### 3. Confirmar Recategorização

```bash
node -e "console.log('Confira a saída acima')" && \
  node scripts/migrate_categories.js
```

## 📞 Suporte

Para erros específicos, verificar:
1. `CATEGORY_MIGRATION.md` - Documentação detalhada
2. Logs: `llm.log`, `pm2 logs api-ciento`
3. Arquivo criado: `Consolidado - Respostas Gerais_backup_*.xlsx`
