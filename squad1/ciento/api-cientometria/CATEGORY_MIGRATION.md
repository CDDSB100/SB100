# Migração de Categorias - Documentação

## Resumo da Mudança

O sistema foi migrado de um esquema de categorias antigas para um novo padrão padronizado:

### Categorias Antigas (Descontinuadas)
- ❌ `MANEJO DE NUTRIENTES E AGUA`
- ❌ `BIOINSUMOS`
- ❌ `MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE`

### Categorias Novas (Ativas)
- ✅ `solos` - Artigos sobre pedologia, física, química e biologia do solo
- ✅ `citros e cana` - Artigos sobre cultivo, manejo e nutrição de citros e cana-de-açúcar

## Mapeamento de Categorias

| Categoria Antiga | Nova Categoria | Lógica |
|---|---|---|
| `MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE` | `citros e cana` | Foco em citros |
| `MANEJO DE NUTRIENTES E AGUA` | *Decidido pela API* | Pode ser solos ou citros |
| `BIOINSUMOS` | `solos` | Relacionado a insumos biológicos do solo |

## Processo de Recategorização

### 1. Migração Automática (Códig Já Implementado)

Quando o sistema carrega os dados (`getCuratedArticles()`):

```javascript
// Mapeamento automático de categorias antigas
const categoryMapping = {
  "MANEJO DE NUTRIENTES E AGUA": "citros e cana",
  "BIOINSUMOS": "solos",
  "MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE": "citros e cana"
};
```

### 2. Categorização por API (Para Categorias Inválidas)

Se uma categoria não está no mapeamento e é inválida:
1. Sistema tenta chamar a API Python `/categorize`
2. API analisa o PDF com LLM Groq
3. Retorna: `solos` ou `citros e cana`

### 3. Script de Migração Completa

Para migrar todos os dados de uma vez:

```bash
node scripts/migrate_categories.js
```

**O que faz:**
- ✓ Identifica categorias antigas/inválidas
- ✓ Re-categoriza usando API
- ✓ Aplica mapeamentos quando arquivo não está disponível
- ✓ Cria backup automático
- ✓ Valida resultado final

## Configuração de Roles e Permissões

### Roles de Curadoria

| Role | Categorias Permitidas |
|---|---|
| `curadoria_solos` | `["solos"]` |
| `curadoria_citros_cana` | `["citros e cana"]` |
| `admin` | Todas as categorias |
| `cientometria` | Todas as categorias |

### Como Atualizar Permissões

Pelo endpoint `/api/users/:id/permissions`:

```json
{
  "role": "curadoria_solos",
  "allowed_categories": ["solos"]
}
```

## API de Categorização

### Endpoint `/categorize`
**POST** `http://localhost:8000/categorize`

**Request:**
```json
{
  "encoded_content": "base64_encoded_pdf_or_text",
  "content_type": "pdf",
  "headers": []
}
```

**Response:**
```json
{
  "category": "solos"
}
```

**Lógica:**
- Analisa o conteúdo do documento
- Se contém palavras-chave de solo → `solos`
- Senão → `citros e cana`

## Validação de Dados

### Verificar Categorias Inválidas

```javascript
// No código
const isValid = ["solos", "citros e cana"].includes(category);
```

### Filtragem por Categoria

Usuários vêem apenas artigos de suas categorias permitidas:

```javascript
// Filtro automático baseado em allowed_categories
articles = articles.filter(article => {
  const category = article.CATEGORIA.trim().toLowerCase();
  return allowed_categories.includes(category);
});
```

## Troubleshooting

### Problema: Categorias antigas aparecem nos dados

**Solução 1:** Executar o script de migração
```bash
node scripts/migrate_categories.js
```

**Solução 2:** Recategorizar manualmente via API
```javascript
// Chamar endpoint /categorize com o PDF
```

### Problema: Usuario recebe "0 artigos"

**Causa:** Suas `allowed_categories` não correspondem às categorias nos dados

**Solução:** 
1. Verificar `allowed_categories` do usuário no banco
2. Confirmar que o valor está em minúsculas
3. Confirmar que é exatamente `"solos"` ou `"citros e cana"`

### Problema: API retorna categorias inválidas

**Causa:** LLM está mal interpretando o conteúdo

**Solução:**
1. Reverificar o prompt no `/categorize`
2. Considerar aumentar o tamanho do teksto enviado para análise
3. Usar o mapeamento manual em casos específicos

## Deployment

### Passo 1: Atualizar Código
```bash
git pull origin main
```

### Passo 2: Reiniciar Servidor
```bash
pm2 restart api-ciento
```

### Passo 3: Executar Migração (Opcional)
```bash
node scripts/migrate_categories.js
```

### Passo 4: Validar
```bash
curl http://localhost:3000/api/curation -H "Authorization: Bearer $TOKEN"
# Verificar se retorna artigos com categorias válidas
```

## Referências

- **Arquivo de Dados:** `Consolidado - Respostas Gerais.xlsx`
- **Coluna:** `CATEGORIA` (índice 35 por padrão)
- **API Python:** `src/utils/llm.py` → endpoint `/categorize`
- **Validação JS:** `src/services/api_logic.js` → `validateAndRepairCategories()`
- **Banco de Dados:** Coluna `allowed_categories` na tabela `users`
