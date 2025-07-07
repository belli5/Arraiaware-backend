### Título do PR: `refactor(component/module): Descrição concisa da refatoração`

Ex: `refactor(users): Improve user data fetching logic`

---

### Descrição

Este Pull Request foca na refatoração do código existente para melhorar sua estrutura, legibilidade, performance ou manutenibilidade, sem alterar o comportamento externo da funcionalidade.

**Motivação:**
Descreva por que esta refatoração foi necessária ou benéfica.
Ex: "A lógica de busca de dados de usuário estava duplicada em múltiplos componentes, dificultando a manutenção e introduzindo potenciais inconsistências. Além disso, a performance poderia ser otimizada com o uso de `React Query`."

**Alterações Principais:**
Descreva as principais mudanças arquiteturais ou estruturais.
Ex: "Centralização da lógica de busca de usuários em um hook customizado (`useUsersData`). Migração de chamadas `fetch` diretas para `React Query` para cache, revalidação e gerenciamento de estados de loading/error."

### Issues Relacionadas

- Relaciona-se com #[Número de Issues de Débito Técnico ou melhoria]

### Tipo de Mudança

- [x] Refatoração (alteração na estrutura ou estilo do código, sem mudança de comportamento)

### Alterações Realizadas

- `[caminho/do/arquivo]`: [Breve descrição da refatoração]
- `[caminho/do/arquivo]`: [Breve descrição da refatoração]

### Como Testar

Como esta é uma refatoração sem mudança de comportamento, o teste consiste em verificar se a funcionalidade original continua operando exatamente como antes.

1.  **Passos para Verificar:**
    * Passo 1: [Ação na UI ou execução de um fluxo]
    * Passo 2: [Resultado Esperado]
    * Passo 3: [Ação na UI ou execução de outro fluxo]
    * Passo 4: [Resultado Esperado]

### Checklist do Desenvolvedor

- [ ] Meu código segue as diretrizes de estilo do projeto.
- [ ] Fiz uma auto-revisão do meu próprio código.
- [ ] Meus comentários são claros, principalmente em áreas complexas do código.
- [ ] Fiz as alterações correspondentes na documentação, se necessário.
- [ ] Minhas alterações não introduzem novos warnings ou erros.
- [ ] Meus testes unitários e/ou de integração existentes continuam passando.
- [ ] Meus testes unitários e/ou de integração **novos** (se houver) cobrem as alterações.
- [ ] Executei os testes de lint e formatação.