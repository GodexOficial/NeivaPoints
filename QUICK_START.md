# ⚡ Quick Start - Supabase Integration

## ✅ Já Configurado

- [x] Variáveis de ambiente (`.env`)
- [x] Cliente Supabase (`src/lib/supabase.ts`)
- [x] Tipos TypeScript (`src/types/supabase.ts`)
- [x] Serviço Supabase (`src/services/supabaseService.ts`)
- [x] Contexto Supabase (`src/context/SupabaseContext.tsx`)

## 🎯 Próximos Passos

### 1. Verificar Tabelas no Supabase (5 min)

Acesse: https://app.supabase.com → Seu Projeto → SQL Editor

Verifique se tem estas tabelas:
- ✅ `classes`
- ✅ `students`
- ✅ `point_transactions`
- ⚪ `teachers` (opcional)

Se não tiver, execute este SQL:

```sql
-- Classes
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade_number INTEGER,
  short_name TEXT,
  color TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Students
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  password TEXT,
  class_id TEXT NOT NULL REFERENCES classes(id),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_sample BOOLEAN DEFAULT FALSE
);

-- Point Transactions
CREATE TABLE point_transactions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'remove')),
  reason TEXT,
  previous_points INTEGER NOT NULL,
  new_points INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices (melhora performance)
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_transactions_student_id ON point_transactions(student_id);
```

### 2. Testar Localmente (5 min)

```bash
# Terminal
npm run dev

# Abra o Console (F12) → Console
# Cole e execute:
```

```javascript
import { SupabaseService } from './src/services/supabaseService';

// Teste 1: Carregar classes
const classes = await SupabaseService.getAllClasses();
console.log('Classes:', classes);

// Teste 2: Criar classe
const newClass = await SupabaseService.createClass({
  name: 'Teste 10º Ano',
  gradeNumber: 10,
  shortName: '10th',
  color: 'green'
});
console.log('Nova classe:', newClass);

// Teste 3: Carregar estudantes
const students = await SupabaseService.getAllStudents();
console.log('Estudantes:', students);
```

Se funcionar, você verá logs com os dados! ✅

### 3. Integrar nos Serviços Existentes (15 min)

Você tem **3 opções**:

#### Opção A: Híbrido (Recomendado)
Use Supabase quando disponível, localStorage como fallback:

Veja o arquivo `MIGRATION_GUIDE.md` para exemplos de código.

#### Opção B: Supabase Puro
Substitua completamente localStorage por Supabase. Edite:
- `src/services/classService.ts`
- `src/services/studentService.ts`
- `src/services/pointsService.ts`

#### Opção C: Gradual
Integre um serviço por vez:
1. Comece com classes
2. Depois estudantes
3. Por último, transações

### 4. Para Produção (GitHub Pages)

1. Vá para seu repositório GitHub
2. **Settings → Secrets and variables → Actions**
3. Clique "New repository secret"
4. Adicione 2 secrets:
   - Nome: `VITE_SUPABASE_URL`
   - Valor: `https://stpvrqjfoimkbwwivkqm.supabase.co`
   
   E:
   - Nome: `VITE_SUPABASE_ANON_KEY`
   - Valor: `sb_publishable_HlVJvGwiHasoVg9Jw7pvKw__3pTOCfP`

5. Seu workflow GitHub Actions usará automaticamente essas variáveis

## 📁 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `.env` | Variáveis de ambiente (local) |
| `.env.example` | Template para o repositório |
| `src/lib/supabase.ts` | Cliente Supabase |
| `src/types/supabase.ts` | Tipos TypeScript |
| `src/services/supabaseService.ts` | Operações CRUD |
| `src/context/SupabaseContext.tsx` | Contexto React |
| `SUPABASE_INTEGRATION.md` | Documentação completa |
| `MIGRATION_GUIDE.md` | Como migrar dados |

## 🚨 Checklist de Segurança

- [ ] Nunca commit `.env` com chaves reais
- [ ] Use `VITE_SUPABASE_ANON_KEY` (chave pública) no frontend
- [ ] Guarde `SERVICE_ROLE_KEY` protegida (nunca no frontend)
- [ ] Configure RLS no Supabase (veja abaixo)
- [ ] Use GitHub Secrets para chaves em produção

## 🔐 RLS (Row Level Security)

Para proteger seus dados, active RLS:

```sql
-- No SQL Editor do Supabase:

-- Tabela: students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON students
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert" ON students
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Repita para outras tabelas...
```

## 🆘 Problemas?

### Console mostra erro "Supabase is not configured"
✅ Normal! Significa que faltam variáveis de ambiente. Verifique `.env`

### Dados não aparecem
❌ Verifique:
1. Tabelas existem no Supabase?
2. Tem dados nelas?
3. RLS não está bloqueando?

Execute no SQL Editor:
```sql
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM classes;
```

### Erro CORS
✅ Supabase aceita requisições do frontend automaticamente

### Performance lenta
Adicione índices:
```sql
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_transactions_student_id ON point_transactions(student_id);
CREATE INDEX idx_transactions_created ON point_transactions(created_at DESC);
```

## 📚 Documentação

- [Documentação Completa](./SUPABASE_INTEGRATION.md)
- [Guia de Migração](./MIGRATION_GUIDE.md)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

## 💬 Perguntas Frequentes

**P: Posso usar localStorage e Supabase juntos?**
R: Sim! Configuramos exatamente assim. Supabase é a fonte primária, localStorage é cache/fallback.

**P: Posso mudar as chaves depois?**
R: Sim! Apenas edite `.env` e reinicie o servidor.

**P: Preciso de autenticação?**
R: Não é obrigatório. Você está usando `anon_key` que permite acesso público. Configure RLS conforme necessário.

**P: Como fazer backup?**
R: Use a função "Export" no dashboard Supabase.

---

**Pronto?** Comece pelo Passo 1! 🚀
