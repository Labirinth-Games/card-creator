# Card Creator

Ferramenta web para criação de cartas usadas em jogos, com designer visual, agrupamento por projetos/decks, tabela de dados, preview e impressão em A4. Todos os dados são salvos localmente (localStorage e arquivos JSON).

## Funcionalidades

- **Designer de Cartas**: Adicione, mova e edite textos e imagens, bordas e camadas na área da carta.
- **Tabela de Dados**: Preencha os valores das cartas, variáveis e quantidade de cópias para impressão.
- **Agrupamento por Projetos/Decks**: Crie múltiplos projetos e decks, cada um com seu designer e tabela de dados.
- **Preview e Impressão**: Visualize como as cartas serão impressas em páginas A4, com margens, espaçamento e opção de frente/verso.
- **Sincronização Designer ↔ Tabela**: Os campos criados no designer (ex: Título, Descrição, Imagem) aparecem automaticamente como colunas editáveis na tabela.
- **Armazenamento Local**: Todos os dados são salvos automaticamente no navegador (localStorage).
- **Exportar/Importar Dados**: 
  - Exportar todos os projetos para arquivo JSON
  - Exportar projeto individual
  - Importar dados de arquivo JSON
  - Auto-save automático a cada 5 minutos (quando há dados)
- **Interface Moderna**: Design limpo com cores suaves, modais personalizados e navegação por abas laterais.

## Instalação e Execução

1. **Pré-requisitos**:
   - Node.js instalado ([download aqui](https://nodejs.org/))

2. **Instalar dependências**:
   Abra o terminal na pasta do projeto e execute:
   ```powershell
   npm install
   ```

3. **Executar o projeto**:
   ```powershell
   npm start
   ```
   O navegador abrirá automaticamente em `http://localhost:3000`.

4. **Build para produção** (opcional):
   ```powershell
   npm run build
   ```

---

Se precisar de mais funcionalidades ou ajustes, basta pedir!
