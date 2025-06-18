# RPE - Rocket Performance & Engagement (Backend)

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=prisma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

Backend da plataforma RPE, uma solução digital completa para centralizar e automatizar a avaliação de desempenho dos colaboradores da Rocket Corp.

> Novo por aqui? Confira o guia de [ONBOARDING](docs/ONBOARDING.md) para começar!

## 🎯 Sobre o Projeto

 A empresa Rocket Corp enfrenta desafios com seu processo de avaliação de desempenho, que é manual, fragmentado e suscetível a vieses.  Gestores relatam dificuldades em consolidar feedbacks e comparar desempenhos de forma estruturada.  A ausência de uma plataforma integrada dificulta a análise de dados e a tomada de decisões estratégicas sobre promoções e treinamentos.

 O **RPE (Rocket Performance and Engagement)** foi criado para resolver esses problemas, oferecendo uma abordagem estruturada e baseada em dados que garante avaliações mais justas, eficientes e alinhadas com os objetivos da organização.

## ✨ Funcionalidades (MVP 1 Concluído)

 Este repositório contém o backend com as funcionalidades essenciais do **MVP 1 - Digitalização Básica do Processo**:

*  **Gestão de Usuários (Colaboradores):** CRUD completo para colaboradores, gestores e outros perfis.
* **Segurança:** Hashing de senhas com `bcrypt` para armazenamento seguro.
*  **Gestão de Cargos/Trilhas (Roles):** CRUD para gerenciar os diferentes papéis na empresa, permitindo a configuração de critérios por cargo/trilha/unidade.
*  **Gestão de Critérios de Avaliação:** CRUD para os critérios de `Comportamento`, `Execução` e `Gestão`.
* **Gestão de Ciclos de Avaliação:** Permite ao RH abrir e fechar os períodos de avaliação.
*  **Submissão de Avaliações:** Endpoints para que os colaboradores possam submeter suas autoavaliações [cite: 22] , avaliações de pares/líderes   e indicações de referência.
* **Validação de Dados:** Uso de DTOs com `class-validator` para garantir a integridade dos dados de entrada.
* **Documentação de API:** Geração automática de uma documentação interativa com Swagger (OpenAPI).

## 🛠️ Tecnologias Utilizadas

* **[NestJS](https://nestjs.com/):** Framework Node.js progressivo para construir aplicações eficientes e escaláveis.
* **[Prisma](https://www.prisma.io/):** ORM de última geração para Node.js e TypeScript.
* **[TypeScript](https://www.typescriptlang.org/):** Superset do JavaScript que adiciona tipagem estática.
* **[SQLite](https://www.sqlite.org/index.html):** Banco de dados relacional para o ambiente de desenvolvimento.
* **[Swagger (OpenAPI)](https://swagger.io/):** Para documentação e teste de API.
* **[Bcrypt](https://www.npmjs.com/package/bcrypt):** Para hashing de senhas.
* **[pnpm](https://pnpm.io/):** Gerenciador de pacotes rápido e eficiente.

## 🚀 Começando

Siga estas instruções para obter uma cópia do projeto e executá-la em sua máquina local para desenvolvimento e testes.

### Pré-requisitos

* [Node.js](https://nodejs.org/en/) (versão 18 ou superior)
* [pnpm](https://pnpm.io/installation)

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/belli5/Arraiaware-backend.git
    ```
    ```bash
    cd Arraiaware-backend
    ```

2.  **Instale as dependências:**
    ```bash
    pnpm install
    ```

3.  **Execute as migrações do banco de dados:**
    Este comando irá criar o banco de dados SQLite e aplicar todas as tabelas necessárias com base no `schema.prisma`.
    ```bash
    pnpm prisma migrate dev
    ```

## ධ Executando a Aplicação

Para iniciar o servidor em modo de desenvolvimento com hot-reload:
```bash
pnpm start:dev
```

A aplicação estará disponível em:
```bash
http://localhost:3000/api-docs
```
