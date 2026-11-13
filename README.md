# Rei do Churrasco — versão 2 Wi-Fi

Aplicativo Android nativo em Kotlin e Jetpack Compose. Implementação conforme as decisões finais: **sem cadastro por e-mail, sem e-mails, sem Firebase e sem serviço na internet**. Cada celular cria seu perfil com nome, apelido e foto. O aparelho criador hospeda os dados dos seus grupos.

## Instalar e usar

1. Instale `entrega/Rei-do-Churrasco-2-WiFi.apk` em todos os celulares (Android 8 ou superior).
2. Crie o perfil em cada aparelho e permita notificações quando solicitado.
3. Conecte os aparelhos à **mesma rede Wi-Fi**. Uma rede de convidados com isolamento entre clientes não funciona.
4. No aparelho criador, abra **Grupos → Criar grupo**. Escolha nome e, opcionalmente, capa. A sincronização inicia automaticamente e aparece uma notificação permanente do Android.
5. Copie ou compartilhe o código numérico de seis dígitos.
6. Nos outros aparelhos, abra **Grupos → Entrar em grupo**, informe o código e toque em **Localizar e entrar**.
7. Mantenha a sincronização Wi-Fi ativa no criador. Ela também é iniciada nos participantes para receber eventos e alterações em segundo plano.

Não é necessário computador ligado, conta na nuvem nem acesso à internet. **Não funciona entre redes Wi-Fi diferentes.** O código localiza um anfitrião na rede local, não é uma conta na internet. Se o criador desligar o compartilhamento, sair da rede ou fechar o app à força, os outros aparelhos consultam o cache e voltam a sincronizar quando ele retorna. Após reiniciar o celular, abra o app e ative a sincronização em Grupos novamente.

## Recursos implementados

- Vários grupos por usuário e participantes sem limite fixo no código; capacidade real depende do aparelho e da rede.
- Grupos separados: placar, eventos, membros, mural de mensagens e fotos.
- Criação de grupos, capa opcional, código de seis números, copiar/compartilhar e renovação pelo administrador. A renovação invalida o convite antigo e mantém os membros existentes.
- Perfil editável com nome, apelido e imagem selecionada do aparelho. A identidade pertence à instalação; não há senha nem recuperação por e-mail.
- Placar real por grupo; apenas o administrador adiciona ou remove pontos.
- Eventos com criação, edição e exclusão pelo autor ou administrador; validação de data futura, horário, local e fuso IANA.
- Cartões compactos e modo espaçado nas configurações, mantendo as abas Placar, Churrascos e Fotos.
- Mural com texto e imagem. Apenas autor ou administrador exclui a publicação.
- Sincronização automática a cada 2,5 segundos com a tela aberta e aproximadamente a cada 15 segundos com o serviço Wi-Fi ativo. Mutações vão ao anfitrião; não há fila de alterações offline.
- Cache persistente de dados e imagens recebidas. Os eventos e publicações já salvos sobrevivem ao encerramento do app.
- Migração dos dados locais da versão anterior: perfil, grupos, eventos e mensagens. Links de imagens antigos são preservados no texto da publicação; o placar fictício de quatro nomes não era dado persistido.

## Notificações locais

Nas configurações, cada usuário pode desativar todos os lembretes, somente o aviso de um dia antes ou somente o aviso no dia. Os horários seguem o fuso do evento:

- Um dia antes: mesmo horário do evento, no dia anterior.
- No dia: às 9h; se o evento começa até as 9h, até 30 minutos antes, respeitando o início do mesmo dia.

O Android agenda os lembretes dos eventos já sincronizados, inclusive sem internet. São alarmes não exatos, sujeitos à economia de bateria do Android. Edição/exclusão cancela e recria os alarmes ao sincronizar. Chaves por grupo/evento/horário/tipo evitam notificações duplicadas. Reinicialização do aparelho e mudanças de relógio/fuso refazem o agendamento.

Eventos novos e cancelamentos só chegam se o anfitrião estiver alcançável e o cliente estiver aberto ou com a sincronização Wi-Fi ativa. Se ambos ficarem desconectados, os lembretes usam a última versão salva. A notificação permanente da sincronização é separada dos lembretes de churrasco. Não há push FCM nem envio de e-mails.

## Segurança e persistência

- Descoberta UDP na porta 45871 e HTTPS/TLS 1.2 na porta 45872.
- Certificado por aparelho no Android Keystore, fixado no cliente após a primeira descoberta (trust on first use). Faça o primeiro ingresso em uma rede confiável; a descoberta inicial por broadcast não autentica a identidade do anfitrião contra um atacante ativo na mesma rede.
- Cada ingresso recebe um token aleatório de 256 bits. O anfitrião persiste apenas o hash do token. Toda consulta, alteração e leitura de imagem exige uma sessão do grupo correspondente.
- Não é possível entrar como administrador ou assumir a identidade de um membro já existente apenas reenviando seu ID.
- Até dez tentativas de ingresso por IP em dez minutos, e limite separado para descoberta por códigos. Retransmissões da mesma busca não consomem novas tentativas. Dois anfitriões podem gerar o mesmo código; se ambos responderem na rede, o ingresso pede que um administrador renove o convite.
- O anfitrião valida as permissões; ocultar um botão não é a proteção de acesso.
- Fotos JPEG são redimensionadas/comprimidas no cliente e limitadas a 3 MB por imagem. Arquivos e JSON ficam no armazenamento privado do aplicativo. Gravações de estado usam arquivo temporário e substituição do arquivo final.
- O app não usa dados fictícios nem chave de demonstração. Firebase e Functions antigos ficam em `docs/legacy-firebase/` somente como histórico.
- Não há backup na nuvem ou transferência de administração. Desinstalar o aplicativo apaga sua identidade local; desinstalar no criador apaga os grupos hospedados. Não desinstale para atualizar: instale o novo APK por cima usando a mesma assinatura.

## Compilar

Requisitos: JDK 17, Android SDK 34 e Build Tools 34.0.0. Configure `local.properties` com o SDK da máquina (este arquivo é local).

```powershell
$env:JAVA_HOME = 'C:\Walkman-tools\java\jdk-17.0.21+9'
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

O APK de desenvolvimento é gerado em `app/build/outputs/apk/debug/app-debug.apk`. A entrega usa a assinatura debug local: é instalável diretamente, mas não é uma versão assinada para publicação na Play Store.

## Organização

- `AppDataModels.kt`: perfil, grupos, eventos, publicações, sessões e mensagens do protocolo.
- `GroupEngine.kt`: regras de negócio, autorização, limitação de tentativas e persistência do anfitrião.
- `LanRpcServer.kt`: transporte HTTPS com limites de tamanho, tempo e concorrência.
- `LanNetwork.kt`: descoberta Wi-Fi, certificado local, cliente com verificação de certificado.
- `LanHostService.kt`: serviço em primeiro plano e sincronização em segundo plano.
- `AppRepository.kt`: estado do aparelho, cache, preparação de imagens e comunicação.
- `AppViewModel.kt`: ações da interface e sincronização enquanto visível.
- `MainActivity.kt`: telas Compose.
- `Reminders.kt`: horários, agendamento e recebimento de notificações locais.
- `LegacyMigration.kt`: preservação dos dados da versão local anterior.

## Validação

Os testes JVM cobrem isolamento entre grupos, mais de quatro membros, sessões persistentes, rejeição de acesso indevido e de tentativa de assumir identidade, limite de tentativas, renovação de convites, placar, datas/fusos, permissões de edição/exclusão, mural e alarmes. Os testes de rede abrem sockets TCP reais, fazem handshake TLS e exercitam ingresso, sessão, publicação e leitura de imagem, incluindo a rejeição de certificado diferente. A chave em `src/test/resources/wifi-test.p12` é uma fixture exclusiva dos testes e não é empacotada no APK.

A compilação, os testes e o Android Lint são executados localmente. Sem aparelhos ou emulador disponíveis neste ambiente, a descoberta UDP, o Keystore Android e o comportamento das notificações em aparelhos físicos ainda precisam da conferência prática descrita em `entrega/COMO-USAR.txt`.

