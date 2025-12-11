# Objetivo
criação de uma ferramenta para criação de cartas usadas em games e imprimir

## imprimir
- deve imprimir todas as cartas dentro de uma pagina A4
- adicionar espaçamento tanto margens da A4 quanto entre cartas
- poder imprimir frente e verso

## designer
criar pagina web com algumas funções que facilitam a criação de cartas de forma criativa e designer clean
- Criar area para fazer designer das cartas
    - adicionar texto, mover, mudar tamanho, mudar cor, mudar fontes
    - adicionar imagem, mover e redimencionar
    - adicionar esquema de layer onde cada item adicionado como texto, imagens mode alternar para frente do outro ou não
    - adicionar bordar na carta, escolher espeçura da borda
    - antes de iniciar o designer pergunta que tipo de carta irá usar, liste os principais tipos de cartas com seus tamanhos e permita que só dentro dessa area pode ser adicionado os elementos como imagens e textos
- Criar area de preenchimento de cartas que é basicamente uma tabela onde será adicionado as informações que ficaram nas cartas.
    - tabela para adicionar valores nas cartas
    - designer das cartas gera variavies que seram subistituidas nassa area
    - adicionar coluna com valor default de copias, onde será adicionado quantas copias da carta será impressa
    - adicionar botão de imprimir cartas, onde leva em consideração a quantidade de copias para adicioanr na impressão.
    - criar preview das paginas que seram impressas

## Agrupamentos
Faça sesão de criação de projetos, ou seja, cada projeto pode ter 1 ou mais decks onde cada deck é representado por 1 designer de carta e uma tabela com dados que iram ser adicionados na cartas para atualizar.
tudo deve ser salvo em banco de dados local baseado em texto msm o mais simples possivel