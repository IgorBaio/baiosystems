## Ideia central:

#### quero fazer um app que funciona como o strava, só que a partir do momento em que o usuario inicia o cronometro ele vai começar a beber (qualquer bebida alcoolica, podemos cadastrar o que ele está bebendo e o teor alcoolico) ; a cada copo terminado ele deve apertar o contador para que incremente e gere a estimativa de copo por tempo (podemos fazer uma unidade de medida de copo por hora e registrar o que seria o nosso km por min sendo nosso copo por min chamada algo como "cupace") ao final da "corrida" gera as mesmas estimativas do strava só que para aquela bebedeira

## Análise pelo ChatGPT

## Conceito do app

Um app inspirado na lógica do Strava, mas aplicado a uma sessão de consumo de bebida alcoólica.

A partir do momento em que o usuário inicia o cronômetro, começa uma “atividade”. Durante essa atividade, ele informa o que está bebendo, o teor alcoólico da bebida e registra cada copo finalizado. Ao encerrar a sessão, o app gera estatísticas equivalentes às de uma corrida no Strava, só que adaptadas para a bebedeira.

## Proposta central

Transformar uma sessão de consumo em uma “atividade rastreável”, com:

- início
- duração
- bebida selecionada
- quantidade de copos consumidos
- ritmo de consumo
- médias por tempo
- resumo final da sessão

## Fluxo principal

### 1. Pré-início da atividade

Antes de iniciar, o usuário define:

- tipo da bebida
- nome da bebida
- teor alcoólico
- volume do copo/unidade
- unidade de contagem

Exemplos:

- cerveja 5%
- vinho 12%
- whisky 40%
- drink personalizado 18%

### 2. Início da atividade

Quando o usuário toca em iniciar:

- o cronômetro começa
- a sessão passa a ser considerada ativa
- o app registra horário de início
- começa a contar tempo total da “corrida”

### 3. Contagem de copos

Durante a atividade:

- cada vez que o usuário termina um copo, ele toca no contador
- o contador incrementa em +1
- o app registra o timestamp daquele copo
- isso permite calcular o ritmo ao longo do tempo

### 4. Métricas em tempo real

Enquanto a sessão acontece, o app pode exibir:

- tempo decorrido
- total de copos
- média de copos por hora
- copos por minuto
- tempo médio por copo
- ritmo atual da sessão

### 5. Encerramento da atividade

Quando o usuário toca em finalizar:

- o cronômetro para
- a sessão é encerrada
- o app calcula os dados finais
- é gerado um resumo da atividade, como no Strava

---

## Equivalência com Strava

A ideia é mapear conceitos do Strava para o contexto de bebida:

- **corrida** → sessão de bebida
- **distância** → quantidade de copos
- **tempo total** → duração total da sessão
- **ritmo por km** → ritmo por copo
- **velocidade média** → copos por hora
- **pace** → “cupace”
- **splits** → blocos de tempo da sessão
- **atividade final** → resumo da bebedeira

---

## Métricas que você descreveu

### 1. Tempo total da atividade

Tempo entre o início e o fim da sessão.

Fórmula:

- `tempo_total = horario_fim - horario_inicio`

### 2. Total de copos

Quantidade total de vezes que o usuário apertou o contador.

Fórmula:

- `total_copos = soma dos incrementos`

### 3. Copos por hora

Equivalente a uma velocidade média.

Fórmula:

- `copos_por_hora = total_copos / horas_totais`

Exemplo:

- 8 copos em 2 horas
- 4 copos/hora

### 4. Copos por minuto

Outra leitura de ritmo.

Fórmula:

- `copos_por_min = total_copos / minutos_totais`

### 5. Tempo médio por copo

Equivalente ao tempo médio necessário para completar uma unidade.

Fórmula:

- `tempo_medio_por_copo = tempo_total / total_copos`

Exemplo:

- 120 minutos / 8 copos = 15 min por copo

### 6. “Cupace”

Nome sugerido por você para ser o equivalente ao pace.

Pode ser definido como:

- **tempo por copo**  
    ou
- **copos por unidade de tempo**

A definição mais próxima do “pace” do Strava seria:

- **cupace = tempo médio por copo**

Exemplo de exibição:

- `cupace: 00:15 / copo`

Ou seja:

- levou 15 minutos, em média, para cada copo

### 7. Ritmo atual

Ritmo considerando o momento da sessão em tempo real.

Fórmula dinâmica:

- `ritmo_atual = copos_consumidos_ate_agora / tempo_decorrido`

### 8. Splits da sessão

A atividade pode ser dividida em blocos, como se fossem parciais:

- a cada 15 min
- a cada 30 min
- a cada 1 hora

Cada split mostraria:

- copos naquele período
- copos acumulados
- ritmo daquele trecho

---

## Dados que o app precisa registrar

Para funcionar como você descreveu, cada sessão precisa salvar:

### Sessão

- id
- usuário
- horário de início
- horário de término
- duração total
- bebida selecionada
- teor alcoólico
- volume por copo
- total de copos
- observações opcionais

### Eventos da sessão

Cada toque no contador gera um evento:

- id do evento
- id da sessão
- timestamp
- número acumulado do copo

Exemplo:

- copo 1 às 20:05
- copo 2 às 20:19
- copo 3 às 20:31

Com isso, o app consegue:

- calcular intervalos entre copos
- gerar gráficos
- calcular splits
- montar linha do tempo

### Cadastro de bebida

- nome
- categoria
- teor alcoólico
- volume padrão
- tipo de unidade

Exemplos:

- cerveja lata 350 ml 5%
- long neck 330 ml 4,8%
- vinho taça 150 ml 12%
- whisky dose 50 ml 40%

---

## Telas do app

### 1. Tela inicial

- botão “Iniciar sessão”
- histórico das últimas atividades
- métricas gerais do usuário

### 2. Tela de configuração da sessão

- escolher bebida
- teor alcoólico
- volume do copo
- nome da sessão
- botão iniciar

### 3. Tela da atividade em andamento

- cronômetro grande
- nome da bebida
- contador de copos
- botão grande “+1 copo”
- copos por hora
- cupace
- talvez gráfico simples em tempo real

### 4. Tela de resumo final

No estilo resumo de atividade:

- duração total
- total de copos
- copos por hora
- copos por minuto
- cupace
- maior ritmo
- timeline de consumo
- gráfico da sessão

### 5. Histórico

Lista de sessões anteriores com:

- data
- bebida
- duração
- total de copos
- cupace
- copos/hora

### 6. Tela de detalhes da atividade

Versão “Strava da sessão”:

- título da atividade
- estatísticas
- gráfico
- splits
- comparações com atividades passadas

---

## Estatísticas finais possíveis

Ao final da atividade, o resumo poderia mostrar:

- duração total
- número total de copos
- média de copos por hora
- média de copos por minuto
- cupace médio
- menor intervalo entre copos
- maior intervalo entre copos
- ritmo mais forte da sessão
- bebida utilizada
- teor alcoólico configurado
- volume total ingerido
- volume total de álcool estimado

---

## Fórmula de álcool puro ingerido

Como você falou em cadastrar bebida e teor alcoólico, o app também pode calcular isso.

Fórmula:

- `alcool_puro_ml = quantidade_copos × volume_copo_ml × (teor_alcoolico / 100)`

Exemplo:

- 6 copos
- 350 ml por copo
- 5%

Resultado:

- `6 × 350 × 0,05 = 105 ml de álcool puro`

---

## Lógica de comparação entre sessões

Como no Strava, o app pode comparar:

- melhor cupace
- maior quantidade de copos em menor tempo
- sessão mais longa
- bebida mais consumida
- média histórica por tipo de bebida
- recordes pessoais

---

## Recursos inspirados no Strava

Você quer claramente uma adaptação da linguagem de app de performance. Então os recursos equivalentes seriam:

### Feed de atividades

- “Sessão finalizada”
- total de copos
- duração
- cupace
- bebida

### Recordes pessoais

- maior número de copos numa sessão
- melhor cupace
- maior copos/hora

### Estatísticas históricas

- sessões por semana
- copos por mês
- bebida mais consumida
- média de ritmo

### Gráficos

- consumo por tempo
- evolução da sessão
- comparação entre sessões
- ranking de bebidas

---

## Requisitos funcionais

1. O usuário deve poder cadastrar bebidas.
2. O usuário deve poder informar teor alcoólico.
3. O usuário deve poder informar volume padrão por copo/unidade.
4. O usuário deve poder iniciar uma sessão com cronômetro.
5. O usuário deve poder incrementar manualmente cada copo terminado.
6. O sistema deve registrar o horário exato de cada incremento.
7. O sistema deve calcular copos por hora.
8. O sistema deve calcular copos por minuto.
9. O sistema deve calcular tempo médio por copo.
10. O sistema deve calcular o “cupace”.
11. O sistema deve gerar um resumo final da atividade.
12. O sistema deve manter histórico de sessões.
13. O sistema deve exibir estatísticas acumuladas por usuário.
14. O sistema deve permitir comparar sessões passadas.

---

## Requisitos não funcionais

- cronômetro precisa continuar confiável em background
- contador precisa responder com um toque
- sessão não pode ser perdida ao fechar o app
- funcionamento mobile first
- interface rápida, simples e com um botão grande de incremento
- persistência local e sincronização opcional com nuvem

---

## Modelo inicial de entidades

### User

- id
- nome
- email
- created_at

### Drink

- id
- user_id
- name
- category
- abv
- default_volume_ml
- unit_name

### Session

- id
- user_id
- drink_id
- started_at
- ended_at
- duration_seconds
- total_cups
- cups_per_hour
- cups_per_minute
- avg_time_per_cup_seconds
- cupace_label
- total_volume_ml
- total_alcohol_ml

### SessionEvent

- id
- session_id
- cup_number
- created_at

---

## Cálculos principais

### Duração

- `ended_at - started_at`

### Total de copos

- `count(session_events)`

### Copos por hora

- `total_cups / (duration_seconds / 3600)`

### Copos por minuto

- `total_cups / (duration_seconds / 60)`

### Tempo médio por copo

- `duration_seconds / total_cups`

### Volume total ingerido

- `total_cups × volume_por_copo_ml`

### Álcool puro total

- `volume_total_ml × (abv / 100)`

---

## Nome da métrica principal

Pelo que você descreveu, o melhor mapeamento fica:

- **Cupace** = pace da bebida
- formato visual: `mm:ss / copo`

Exemplo:

- `12:40 / copo`

Alternativas de naming:

- cupace
- drink pace
- brew pace
- sip rate
- pour pace

Mas “cupace” é o nome mais alinhado com o que você propôs.

---

## Resumo do produto em uma frase

Um app no estilo Strava em que o usuário inicia uma sessão de bebida, registra cada copo consumido ao longo do tempo e, no fim, recebe estatísticas de desempenho da sessão, como duração, total de copos, copos por hora e “cupace”.

## Considerações

- Para qualquer coisa que deva ser salva em histórico deve ser usado localStorage
- Ao final de uma "corrida" devemos gerar uma espécie de Dash onde mostramos o "feito" e os calculos da pessoa, e esse resultado deve ser disponibilizado para que o usuário possa salvar a imagem em sua galeria ou compartilhar. 