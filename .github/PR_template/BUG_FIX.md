### Título do PR: `fix(component/module): Descrição concisa do bug resolvido`

Ex: `fix(auth): Correctly handle expired tokens on login`

---

### Descrição

Este Pull Request resolve um bug específico na funcionalidade de `[nome da funcionalidade/componente]`.

**Problema:**
Descreva o bug que estava ocorrendo.
Ex: "Usuários eram redirecionados para a página de login sem aviso quando seus tokens expiravam durante a navegação, resultando em perda de dados não salvos."

**Solução:**
Descreva a correção implementada e como ela aborda o problema.
Ex: "Implementado um interceptor HTTP que detecta respostas 401 (Unauthorized) e tenta silenciosamente renovar o token antes de redirecionar o usuário."

### Issues Relacionadas

- Closes #[Número da Issue do Bug]
- Relaciona-se com #[Número de outra Issue, se houver]

### Tipo de Mudança

- [x] Bug fix (correção de um problema não disruptivo)
- [ ] Hotfix (correção urgente para um problema em produção)

### Alterações Realizadas

- `[arquivo/caminho]`: Breve descrição da mudança neste arquivo.
- `[arquivo/caminho]`: Breve descrição da mudança neste arquivo.

### Como Testar

1.  **Pré-requisitos:** [Mencione quaisquer pré-requisitos, como credenciais específicas, dados, etc.]
2.  **Passos para Reproduzir o Bug (antes):**
    * Passo 1
    * Passo 2
    * ...
3.  **Passos para Verificar a Correção (depois):**
    * Passo 1: [Ação]
    * Passo 2: [Resultado Esperado]
    * Passo 3: [Ação]
    * Passo 4: [Resultado Esperado]

### Screenshots/Vídeos (Opcional)

![gif ou imagem da correção em ação]

### Checklist do Desenvolvedor

- [ ] Meu código segue as diretrizes de estilo do projeto.
- [ ] Fiz uma auto-revisão do meu próprio código.
- [ ] Meus comentários são claros, principalmente em áreas complexas do código.
- [ ] Fiz as alterações correspondentes na documentação, se necessário.
- [ ] Minhas alterações não introduzem novos warnings ou erros.
- [ ] Meus testes unitários e/ou de integração passam localmente com minhas alterações.
- [ ] Executei os testes de lint e formatação.