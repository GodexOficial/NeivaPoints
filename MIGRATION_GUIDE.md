# 📚 Guia de Migração para Supabase

## Visão Geral

Este guia explica como migrar dados do localStorage para Supabase e integrar gradualmente a nova camada de dados.

## 🔄 Abordagem Recomendada

### Fase 1: Testes (Já Completa ✅)
- [x] Cliente Supabase configurado
- [x] Serviço Supabase criado
- [x] Tipos TypeScript definidos

### Fase 2: Integração Gradual (Próximo Passo)

#### Passo 1: Atualizar `StudentContext.tsx`

Modifique o contexto existente para usar Supabase quando disponível:

```typescript
import { SupabaseService } from '../services/supabaseService';
import { StorageService } from '../services/storage';

// ... dentro do contexto ...

const loadStudents = async () => {
  setIsLoading(true);
  try {
    let students;
    
    // Tenta carregar do Supabase primeiro
    if (import.meta.env.VITE_SUPABASE_URL) {
      students = await SupabaseService.getAllStudents();
    }
    
    // Fallback para localStorage
    if (!students || students.length === 0) {
      students = StorageService.getStudents([]);
    }
    
    setStudents(students);
  } catch (error) {
    console.error('Error loading students:', error);
    // Fallback para localStorage em caso de erro
    const students = StorageService.getStudents([]);
    setStudents(students);
  } finally {
    setIsLoading(false);
  }
};
```

#### Passo 2: Atualizar `ClassService.ts`

Modifique os métodos para sincronizar com Supabase:

```typescript
static async getAllClasses(): Promise<ClassInfo[]> {
  // Tenta Supabase primeiro
  if (import.meta.env.VITE_SUPABASE_URL) {
    try {
      const supabaseClasses = await SupabaseService.getAllClasses();
      if (supabaseClasses.length > 0) {
        StorageService.setClasses(supabaseClasses); // Cache local
        return supabaseClasses;
      }
    } catch (error) {
      console.warn('Supabase error, falling back to localStorage:', error);
    }
  }
  
  // Fallback para localStorage
  const stored = StorageService.getClasses<ClassInfo[] | null>(null);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    StorageService.setClasses(DEFAULT_CLASSES);
    return DEFAULT_CLASSES;
  }
  return stored;
}

static async createClass(params: any): Promise<ClassInfo> {
  const newClass = {
    id: this.generateId(params.name),
    name: params.name,
    // ... outros campos ...
  };

  // Salva no Supabase
  if (import.meta.env.VITE_SUPABASE_URL) {
    try {
      await SupabaseService.createClass(params);
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  }

  // Salva no localStorage como backup
  const classes = this.getAllClasses();
  const updated = [...classes, newClass];
  StorageService.setClasses(updated);

  return newClass;
}
```

#### Passo 3: Atualizar `PointsService.ts`

Modifique para sincronizar transações:

```typescript
static async addPoints(params: any): Promise<PointActionResult> {
  // ... validação existente ...

  const transaction: PointTransaction = {
    id: this.generateTransactionId(),
    studentId: params.studentId,
    amount,
    type: 'add',
    reason: params.reason?.trim() || undefined,
    previousPoints,
    newPoints,
    createdAt: now,
  };

  // Salva no Supabase
  if (import.meta.env.VITE_SUPABASE_URL) {
    try {
      await SupabaseService.createTransaction(transaction);
      await SupabaseService.updateStudent(params.studentId, {
        points: newPoints,
      });
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  }

  // Sempre salva no localStorage
  const transactions = StorageService.getTransactions<PointTransaction[]>([]);
  transactions.unshift(transaction);
  StorageService.setTransactions(transactions);

  // ... resto do método ...
}
```

## 📤 Migrando Dados Existentes

### Script de Migração (executar no Console do Navegador)

```javascript
// 1. Extrair dados do localStorage
const students = JSON.parse(localStorage.getItem('student_points_tracker_students_v1') || '[]');
const transactions = JSON.parse(localStorage.getItem('student_points_tracker_transactions_v1') || '[]');
const classes = JSON.parse(localStorage.getItem('student_points_tracker_classes_v1') || '[]');

console.log('Estudantes:', students.length);
console.log('Transações:', transactions.length);
console.log('Classes:', classes.length);

// 2. Copiar para clipboard
const migrationData = {
  students,
  transactions,
  classes,
};
console.log(JSON.stringify(migrationData));
```

### Importar no Supabase

1. No dashboard Supabase, vá para **SQL Editor**
2. Crie um script SQL para inserir os dados:

```sql
-- Inserir classes
INSERT INTO classes (id, name, grade_number, short_name, color, description, created_at)
VALUES 
  ('6th-grade', '6th Grade', 6, '6th', 'blue', '6th Grade Academic Class', NOW()),
  ('7th-grade', '7th Grade', 7, '7th', 'indigo', '7th Grade Academic Class', NOW()),
  ('8th-grade', '8th Grade', 8, '8th', 'purple', '8th Grade Academic Class', NOW()),
  ('9th-grade', '9th Grade', 9, '9th', 'violet', '9th Grade Academic Class', NOW());

-- Inserir estudantes (ajuste os IDs das classes conforme necessário)
INSERT INTO students (id, name, username, password, class_id, points, created_at, updated_at)
VALUES 
  ('std_123', 'João Silva', 'joao.silva', '123456', '6th-grade', 100, NOW(), NOW()),
  -- ... adicione mais estudantes aqui ...
;

-- Inserir transações
INSERT INTO point_transactions (id, student_id, amount, type, reason, previous_points, new_points, created_at)
VALUES 
  ('tx_123', 'std_123', 10, 'add', 'Participation', 90, 100, NOW()),
  -- ... adicione mais transações aqui ...
;
```

## ✅ Verificação de Integração

### Testes Locais

```bash
# 1. Inicie o servidor
npm run dev

# 2. Abra o console do navegador (F12)

# 3. Teste o carregamento
import { SupabaseService } from './src/services/supabaseService';

const classes = await SupabaseService.getAllClasses();
console.log('Classes:', classes);

const students = await SupabaseService.getAllStudents();
console.log('Students:', students);
```

### Verificação em Produção (GitHub Pages)

1. Vá para `Settings → Secrets and variables → Actions`
2. Adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. Verifique se seu workflow (`.github/workflows/deploy.yml`) passa as variáveis:

```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

## 🔐 Segurança

### ⚠️ Regras Importantes

1. **Nunca commite `.env` com chaves reais**
   - Use `.env.local` para desenvolvimento
   - Use GitHub Secrets para produção

2. **Configure RLS (Row Level Security) no Supabase**
   ```sql
   -- Exemplo: Permitir leitura pública
   ALTER TABLE students ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow public read" ON students
     FOR SELECT USING (true);
   ```

3. **Valide dados no backend** (se tiver)
   - Nunca confie apenas na validação do frontend

## 🐛 Troubleshooting

### Erro: "Failed to fetch from Supabase"
- Verifique a URL e a chave no `.env`
- Verifique as políticas de CORS no Supabase
- Verifique os logs de erro no console

### Dados não aparecem
- Verifique se as tabelas têm dados
- Verifique se RLS não está bloqueando a leitura
- Use `SELECT * FROM students LIMIT 10;` no SQL Editor

### Performance lenta
- Adicione índices nas colunas mais usadas
- Use paginação para tabelas grandes
- Cache dados no localStorage

## 📞 Suporte

- Documentação Supabase: https://supabase.com/docs
- Fórum da comunidade: https://github.com/supabase/supabase/discussions

