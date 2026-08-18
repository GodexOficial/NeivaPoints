# Integração Supabase - Guia Completo

## 📋 Status da Configuração

✅ **Configuração Concluída:**
- [x] Variáveis de ambiente configuradas (`.env`)
- [x] Biblioteca `@supabase/supabase-js` instalada
- [x] Cliente Supabase inicializado (`src/lib/supabase.ts`)
- [x] Tipos TypeScript definidos (`src/types/supabase.ts`)
- [x] Serviço Supabase criado (`src/services/supabaseService.ts`)

## 🔑 Suas Credenciais

```env
URL: https://stpvrqjfoimkbwwivkqm.supabase.co
ANON_KEY: sb_publishable_HlVJvGwiHasoVg9Jw7pvKw__3pTOCfP
```

> ⚠️ **Importante:** Essas são chaves públicas (anon key) - são seguras para usar no frontend. Nunca exponha sua `SERVICE_ROLE_KEY` no código frontend!

## 📊 Estrutura das Tabelas no Supabase

Certifique-se de que você tem as seguintes tabelas criadas:

### 1. **classes**
```sql
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade_number INTEGER,
  short_name TEXT,
  color TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. **students**
```sql
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
```

### 3. **point_transactions**
```sql
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
```

### 4. **teachers** (Opcional)
```sql
CREATE TABLE teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email_or_username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Como Usar o `SupabaseService`

### Exemplo 1: Buscar todas as classes

```typescript
import { SupabaseService } from '@/services/supabaseService';

const classes = await SupabaseService.getAllClasses();
console.log(classes);
```

### Exemplo 2: Criar uma nova classe

```typescript
const newClass = await SupabaseService.createClass({
  name: '10º Ano',
  gradeNumber: 10,
  shortName: '10th',
  color: 'green',
  description: 'Turma de 10º ano',
});
```

### Exemplo 3: Buscar todos os estudantes

```typescript
const students = await SupabaseService.getAllStudents();
console.log(students);
```

### Exemplo 4: Criar um novo estudante

```typescript
const student = await SupabaseService.createStudent({
  name: 'João Silva',
  classId: '10th-grade',
  username: 'joao.silva',
  password: '123456',
});
```

### Exemplo 5: Adicionar pontos (com transação)

```typescript
const student = await SupabaseService.getStudentById('std_xxx');
const newPoints = (student?.points || 0) + 10;

await SupabaseService.updateStudent('std_xxx', {
  points: newPoints,
});

const transaction = {
  id: `tx_${Date.now()}`,
  studentId: 'std_xxx',
  amount: 10,
  type: 'add' as const,
  reason: 'Participação em aula',
  previousPoints: student?.points || 0,
  newPoints: newPoints,
  createdAt: new Date().toISOString(),
};

await SupabaseService.createTransaction(transaction);
```

## 🔄 Integração com Contextos Existentes

Para integrar com seus contextos React, você pode criar um hook customizado:

```typescript
// hooks/useSupabase.ts
import { useEffect, useState } from 'react';
import { SupabaseService } from '@/services/supabaseService';
import type { Student, ClassInfo } from '@/types';

export function useSupabaseStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await SupabaseService.getAllStudents();
        setStudents(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return { students, loading, error };
}
```

## 🛡️ Políticas de Segurança (RLS)

Para proteger seus dados no Supabase, configure Row Level Security (RLS):

1. Vá para **Authentication → Policies** no dashboard do Supabase
2. Crie políticas para cada tabela

**Exemplo para tabela `students`:**
```sql
-- Permitir leitura pública
CREATE POLICY "Allow public read" ON students
  FOR SELECT USING (true);

-- Permitir insert apenas para autenticados
CREATE POLICY "Allow authenticated insert" ON students
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## 📝 Próximos Passos

1. **Verificar as tabelas:** Certifique-se de que todas as tabelas existem no Supabase
2. **Atualizar os serviços:** Modifique `classService.ts`, `studentService.ts` e `pointsService.ts` para usar `SupabaseService`
3. **Testar a conexão:** Execute `npm run dev` e verifique o console
4. **Migrars dados:** Se necessário, transfira dados do localStorage para Supabase

## 🐛 Troubleshooting

### Erro: "Supabase is not configured"
- Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão no `.env`
- Reinicie o servidor (`npm run dev`)

### Erro: "Database error"
- Verifique se as tabelas existem no Supabase
- Verifique se os nomes das colunas estão corretos (snake_case)
- Verifique as políticas de RLS

### Performance Lenta
- Adicione índices nas tabelas (especialmente em `class_id`, `student_id`)
- Use paginação para tabelas grandes

## 🔐 Variáveis de Ambiente Seguras

Nunca commite o arquivo `.env` com chaves reais! Use:
- `.env.local` (para desenvolvimento local)
- `.env.example` (modelo para o repositório)
- Variáveis de ambiente no GitHub Pages/Vercel (para produção)

Para GitHub Pages, use GitHub Secrets:
1. Vá para **Settings → Secrets and variables → Actions**
2. Adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Use no seu workflow (`.github/workflows/*.yml`)

