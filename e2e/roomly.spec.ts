import { expect, test, type Page } from "@playwright/test";
test("catalog filters rooms and keeps the booking surface reachable", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Uma sala pronta quando você precisar.",
    }),
  ).toBeVisible();
  await page.getByLabel("Pessoas").selectOption("12");
  await expect(page.getByText("1 sala encontrada")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Atelier Criativo" }),
  ).toBeVisible();
  const roomImage = page.getByRole("img", { name: "Atelier Criativo" });
  await expect(roomImage).toBeVisible();
  // As fotos do acervo passam de 2 MB. Na primeira execução o otimizador do
  // `next/image` ainda não tem cache, e redimensionar três PNGs desse tamanho
  // com os projetos desktop e mobile disputando CPU passa dos 20s. O ativo
  // pesado é o problema de fundo — anotado para o lote de limpeza.
  await expect
    .poll(
      () =>
        roomImage.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      { timeout: 60_000 },
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("catalog.png"),
    fullPage: true,
  });
});
/**
 * O mês seguinte está inteiramente livre no simulador, então a escolha não
 * depende da hora em que a suíte roda — depois das 19h o dia de hoje não
 * comporta mais a reserva mínima de uma hora.
 *
 * `edge` separa os testes que reservam: o simulador guarda as reservas num mapa
 * único do processo, e desktop e mobile rodam em paralelo contra ele. Dias
 * diferentes garantem que um teste nunca veja a reserva do outro.
 */
/** O texto na representação que está de fato na tela: tabela ou lista de cards. */
function visible(page: Page, text: string) {
  return page.getByText(text, { exact: true }).filter({ visible: true });
}

async function pickFreeDay(page: Page, edge: "first" | "last" = "first") {
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  const days = page.locator('[data-testid^="day-"][data-state="free"]');
  await (edge === "first" ? days.first() : days.last()).click();
}

test("customer completes a simulated PIX booking and gets the copy-paste code", async ({
  page,
}, testInfo) => {
  const slug =
    testInfo.project.name === "mobile" ? "sala-foco" : "sala-executiva";
  await page.goto(`/salas/${slug}`);
  await pickFreeDay(page);
  await page.getByTestId("continue-booking").click();
  await expect(
    page.getByRole("heading", { name: "Como prefere pagar?" }),
  ).toBeVisible();
  await page.getByTestId("confirm-payment").click();
  // PIX nasce pendente: a tela NÃO pode dizer "confirmada" antes do pagamento.
  // Ela mostra o copia-e-cola e explica que a confirmação vem depois.
  await expect(page.getByTestId("booking-pix")).toBeVisible();
  await expect(page.getByText("Aguardando pagamento")).toBeVisible();
  await expect(page.getByTestId("pix-code")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pague o PIX para confirmar" })).toBeVisible();
  // O anúncio falso de "Reserva confirmada / PIX aprovado" não pode aparecer.
  await expect(page.getByText("Reserva confirmada")).toHaveCount(0);
  await expect(page.getByText("PIX aprovado")).toHaveCount(0);
});
test("customer cancellation revokes the access", async ({ page }) => {
  await page.goto("/minhas-reservas");
  // A listagem nunca mostra o código: ele vive só na página da reserva, com
  // sessão ativa.
  await expect(page.getByText("921")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancelar reserva" }).click();
  // O cancelamento é uma server action: a asserção espera uma ida ao servidor,
  // que passa dos 5s padrão quando os projetos rodam em paralelo.
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Acesso revogado")).toBeVisible();
});

test("booking detail shows the credential state and the extension offer", async ({
  page,
}) => {
  await page.goto("/minhas-reservas");
  await page.getByTestId("booking-detail-link").click();
  await expect(page).toHaveURL(/\/minhas-reservas\/booking_demo/);

  // A reserva começa em 45 minutos: o código ainda não foi liberado, e o card
  // diz a que horas será — em vez de mostrar um número que não abre a porta.
  const credential = page.getByRole("region", { name: "Código de acesso" });
  await expect(credential).toContainText("Seu código aparece 5 minutos antes");

  const extension = page.getByRole("region", { name: "Estender reserva" });
  await expect(extension).toContainText("O expediente encerra às 20:00.");
  await expect(page.getByTestId("extend-booking")).toContainText("Estender até");
});
test("header shows the signed-in account and opens its menu", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByTestId("user-menu-trigger");
  await expect(trigger).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toHaveCount(0);
  await trigger.click();
  await expect(page.getByRole("menu", { name: "Conta" })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Editar conta" }),
  ).toBeVisible();
  await expect(page.getByTestId("sign-out")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Conta" })).toHaveCount(0);
});

test("admin exposes operational status", async ({ page }, testInfo) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();
  await expect(page.getByText("Fechaduras online")).toBeVisible();
  await page.goto("/admin/fechaduras");
  await expect(page.getByRole("heading", { name: "Fechaduras" })).toBeVisible();
  // A `DataTable` mantém tabela e lista de cards no DOM, alternadas por CSS —
  // o filtro de visibilidade verifica a representação daquele viewport.
  await expect(visible(page, "TTLock B-101")).toHaveCount(1);
  await page.getByLabel("Buscar em Fechaduras").fill("B-101");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/q=B-101/);
  // A ausência sozinha passaria enquanto o esqueleto está na tela, quando ainda
  // não há linha nenhuma. Esperar a linha filtrada prova que o conteúdo chegou.
  await expect(visible(page, "TTLock B-101")).toHaveCount(1);
  await expect(visible(page, "TTLock A-201")).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    await page.getByTitle("Abrir menu").click();
    await expect(
      page.getByRole("navigation", { name: "Administração" }),
    ).toBeVisible();
    await page.getByLabel("Fechar menu").last().click();
  }
  await page.screenshot({
    path: testInfo.outputPath("admin-locks.png"),
    fullPage: false,
  });
});

test("room form swaps automatic images for an upload field", async ({
  page,
}) => {
  await page.goto("/admin/salas");
  await page.getByRole("button", { name: "Nova sala" }).click();
  const automatic = page.getByLabel("Adicionar imagens aleatórias");
  await expect(automatic).toBeChecked();
  await expect(page.getByLabel("Fotos da sala")).toHaveCount(0);
  await expect(page.getByLabel("Sala possui câmera?")).not.toBeChecked();

  await automatic.uncheck();
  const upload = page.getByLabel("Fotos da sala");
  await expect(upload).toBeVisible();
  await expect(upload).toHaveAttribute("multiple", "");
  await expect(upload).toHaveAttribute(
    "accept",
    "image/jpeg,image/png,image/webp",
  );

  await automatic.check();
  await expect(page.getByLabel("Fotos da sala")).toHaveCount(0);
});

test("admin edits a room from its own row", async ({ page }) => {
  await page.goto("/admin/salas");
  await page
    .getByRole("button", { name: /Editar Sala Executiva/ })
    .first()
    .click();

  // Só o diálogo aberto monta o formulário: nada de um por linha no DOM.
  const dialogo = page.locator("dialog[open]");
  await expect(dialogo).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Editar Sala Executiva" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(
    "Sala Executiva",
  );
  await expect(page.getByLabel("Situação")).toHaveValue("active");
  await expect(page.getByLabel(/Trocar por imagem aleatória/)).not.toBeChecked();

  await page.getByTitle("Fechar").click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("internal worker rejects requests without the cron secret", async ({
  request,
}) => {
  const response = await request.post("/api/internal/jobs/run");
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    error: "unauthorized",
  });
});

test("a booked block cannot be selected and says why", async ({
  page,
}, testInfo) => {
  // Uma sala por projeto: desktop e mobile rodam em paralelo contra o mesmo
  // servidor, e reservar a mesma sala faria um teste ver a reserva do outro.
  const slug =
    testInfo.project.name === "mobile" ? "atelier-criativo" : "sala-foco";
  await page.goto(`/salas/${slug}`);
  await pickFreeDay(page, "last");

  const chosen = page.locator('[data-testid^="slot-"][aria-pressed="true"]');
  const day = await page
    .locator('[aria-selected="true"][data-testid^="day-"]')
    .getAttribute("data-testid");
  const slot = await chosen.getAttribute("data-testid");
  await expect(chosen).toHaveAttribute("data-state", "available");

  await page.getByTestId("continue-booking").click();
  await page.getByTestId("confirm-payment").click();
  // O hold já bloqueia a sala; a tela de PIX pendente confirma que a POST saiu.
  await expect(page.getByTestId("booking-pix")).toBeVisible();

  await page.goto(`/salas/${slug}`);
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await page.getByTestId(String(day)).click();

  const taken = page.getByTestId(String(slot));
  await expect(taken).toHaveAttribute("data-state", "booked");
  await expect(taken).toHaveAttribute("aria-label", /indisponível, reservado$/);
  await expect(taken).toHaveAttribute("aria-disabled", "true");

  // O Playwright se recusa a clicar num elemento não habilitado, e `aria-disabled`
  // conta como tal — a mesma leitura que um leitor de tela faz. Forçado, o
  // clique tampouco seleciona.
  await expect(taken).toBeDisabled();
  await taken.click({ force: true });
  await expect(taken).toHaveAttribute("aria-pressed", "false");

  // A limpeza logo depois da reserva também não é vendável, e diz por quê.
  const cleaning = page.locator('[data-testid^="slot-"][data-state="cleaning"]');
  await expect(cleaning.first()).toHaveAttribute(
    "aria-label",
    /indisponível, limpeza entre reservas$/,
  );
});

test("catalog filters by unit and shows real availability", async ({ page }) => {
  await page.goto("/");

  // A linha de horários é o que separa este card de um card de e-commerce.
  const executiva = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Sala Executiva" }) });
  await expect(
    executiva.getByText(/Livre|Próximo|Sem horário/).first(),
  ).toBeVisible();
  await expect(executiva.getByTestId("book-sala-executiva")).toBeVisible();

  await page.getByLabel("Unidade").selectOption("Centro Joinville");
  await expect(page.getByText("1 sala encontrada")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Atelier Criativo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sala Executiva" }),
  ).toHaveCount(0);

  // O chip devolve o filtro ao estado inicial, e a contagem acompanha.
  await page.getByRole("button", { name: "Remover filtro Centro Joinville" }).click();
  await expect(page.getByText("3 salas encontradas")).toBeVisible();
});

test("ordering by price rearranges the catalog", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Ordenar salas").selectOption("price");
  const names = await page.getByRole("heading", { level: 3 }).allInnerTexts();
  // Sala Foco custa R$ 75/h, a menor tarifa do acervo.
  expect(names[0]).toBe("Sala Foco");
});

test("panel puts pendencies before metrics and fills the operational screens", async ({
  page,
}) => {
  await page.goto("/admin");
  // Pendência antes de métrica: uma sala suja importa mais que a receita do mês.
  const pendencies = page.getByRole("heading", { name: "Precisa de atenção" });
  const metrics = page.getByText("Ocupação hoje");
  await expect(pendencies).toBeVisible();
  await expect(metrics).toBeVisible();
  const order = await pendencies.evaluate((heading, other) => {
    const position = heading.compareDocumentPosition(other as Node);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? "before" : "after";
  }, await metrics.elementHandle());
  expect(order).toBe("before");
  await expect(page.getByText("Limpeza atrasada")).toBeVisible();

  await page.goto("/admin/calendario");
  await expect(page.getByLabel("Dia")).toBeVisible();
  await expect(page.getByText("09:00 – 10:30")).toBeVisible();

  await page.goto("/admin/relatorios");
  await expect(page.getByText("Horas vendidas")).toBeVisible();
  await expect(page.getByText("Ocupação média")).toBeVisible();

  await page.goto("/admin/configuracoes");
  await expect(visible(page, "Expediente")).toHaveCount(1);
  await expect(visible(page, "08:00 – 20:00")).toHaveCount(1);

  await page.goto("/admin/limpeza");
  await expect(page.getByText("Atrasada 45 min")).toBeVisible();
  const assign = page.getByRole("button", { name: "Atribuir a mim" });
  await expect(assign).toBeVisible();

  // A linha muda de status no lugar; o aviso é o que confirma que a ação saiu.
  await assign.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Limpeza atribuída a você." }),
  ).toBeVisible();
});

test("theme choice survives a reload", async ({ page }) => {
  await page.goto("/");
  const dark = page.getByRole("radio", { name: "Tema escuro" });
  await dark.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // O script inline reaplica antes da primeira pintura: sem ele a página
  // piscaria clara a cada navegação completa.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("radio", { name: "Tema escuro" }),
  ).toHaveAttribute("aria-checked", "true");

  await page.getByRole("radio", { name: "Tema do sistema" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test.describe("tema escuro", () => {
  test.use({ colorScheme: "dark" });

  test("the dark layer swaps only the semantic tokens", async ({ page }) => {
    await page.goto("/");
    const ground = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );
    // navy-950: a página troca de fundo sem que nenhum componente saiba disso.
    expect(ground).toBe("rgb(14, 22, 48)");

    const heading = page.getByRole("heading", {
      name: "Uma sala pronta quando você precisar.",
    });
    await expect(heading).toBeVisible();
    const ink = await heading.evaluate((node) => getComputedStyle(node).color);
    expect(ink).toBe("rgb(244, 247, 255)");

    // O primário continua coral nos dois temas: é a marca, não o tema. Lido do
    // token, e não de um botão — qual botão é primário no catálogo depende da
    // disponibilidade do dia, e a asserção não pode depender da hora.
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--action-primary")
        .trim()
        .toUpperCase(),
    );
    expect(accent).toBe("#FB5131");
  });
});

test.describe("gaveta do painel sem JavaScript", () => {
  // A gaveta abria por estado do React, então o primeiro toque — o que a pessoa
  // dá assim que a tela aparece, antes de o JavaScript carregar — se perdia sem
  // sinal nenhum. Desligar o JavaScript é a única forma de provar que ela
  // deixou de depender dele.
  test.use({ javaScriptEnabled: false });

  test("mobile menu opens before the page is interactive", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "gaveta só existe no telefone");
    await page.goto("/admin/fechaduras");
    const nav = page.getByRole("navigation", { name: "Administração" });
    await expect(nav).toBeHidden();
    await page.getByTitle("Abrir menu").click();
    await expect(nav).toBeVisible();
    await page.getByLabel("Fechar menu").click();
    await expect(nav).toBeHidden();
  });
});

test("room links to the coworking profile, which lists its rooms", async ({
  page,
}) => {
  await page.goto("/salas/sala-executiva");
  // O rótulo nomeia o coworking: "Ver perfil" sozinho não diz de quem, e num
  // leitor de tela essa é a única pista.
  const link = page.getByRole("link", { name: /Ver perfil de Ágora Coworking/ });
  await expect(link).toBeVisible();
  await link.click();

  await expect(page).toHaveURL(/\/coworkings\/agora-coworking/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ágora Coworking" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "3 salas disponíveis" }),
  ).toBeVisible();
  await expect(visible(page, "Sala Foco")).toHaveCount(1);
});

test("room form lets the owner choose when cleaning is called", async ({
  page,
}) => {
  await page.goto("/admin/salas");
  await page.getByRole("button", { name: "Nova sala" }).click();

  const grupo = page.getByRole("group", { name: "Acionar a limpeza" });
  await expect(grupo).toBeVisible();
  // O padrão é o fim da reunião: é o comportamento que o produto sempre teve, e
  // uma sala nova não deve mudar de conduta sozinha.
  await expect(grupo.getByLabel("Quando")).toHaveValue("fim");

  await grupo.getByLabel("Quando").selectOption("antes");
  await grupo.getByLabel("Minutos").fill("30");
  await expect(grupo.getByLabel("Minutos")).toHaveValue("30");
});

test("owner edits the coworking profile from the settings screen", async ({
  page,
}) => {
  await page.goto("/admin/configuracoes");
  await expect(
    page.getByRole("heading", { name: "Perfil do coworking" }),
  ).toBeVisible();
  // O formulário aponta para a própria página pública: quem edita precisa saber
  // onde o texto vai aparecer.
  await expect(
    page.getByRole("link", { name: "Ágora Coworking" }),
  ).toHaveAttribute("href", "/coworkings/agora-coworking");

  await page.getByLabel("Telefone da limpeza").fill("(47) 90000-0000");
  await page.getByTestId("save-company").click();
  await expect(page.getByText(/Salvo no simulador|atualizado/)).toBeVisible();
});

test("rodapé leva às páginas legais e a página de cookies é honesta", async ({
  page,
}) => {
  await page.goto("/");

  const rodape = page.getByRole("contentinfo");
  await expect(rodape.getByText("68.790.675/0001-15")).toBeVisible();
  await rodape.getByRole("link", { name: "Aviso de Privacidade" }).click();

  await expect(page).toHaveURL(/\/privacidade/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Aviso de Privacidade" }),
  ).toBeVisible();
  // O controlador identificado é o que torna o documento válido; sem ele a
  // página é decoração.
  await expect(
    page.getByRole("main").getByText("68.790.675 Arthur Schmitt de Freitas"),
  ).toBeVisible();

  await page.goto("/cookies");
  // A página existe para dizer que não há rastreamento. Se alguém adicionar um
  // rastreador e esquecer de atualizar o texto, a afirmação vira mentira, e
  // este teste é o lembrete de que ela é verificável.
  await expect(page.getByText(/Não há Google Analytics/)).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3);
});

test("aba Como funciona explica a reserva do começo ao fim", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Como funciona" }).first().click();

  await expect(page).toHaveURL(/\/como-funciona/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Da escolha do horário/ }),
  ).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "PASSO" })).toHaveCount(6);
  await page.getByRole("link", { name: "Ver salas disponíveis" }).click();
  await expect(page).toHaveURL(/localhost:3100\/$|127\.0\.0\.1:3100\/$/);
});

/**
 * O login devolve a pessoa para onde ela foi interrompida.
 *
 * A suíte roda em modo simulador, onde há sempre um cliente autenticado, então
 * o portão da reserva em si não aparece aqui. O que aparece — e é a metade
 * sensível — é o destino de volta: ele vem da URL, e um destino externo aceito
 * transformaria a tela de senha do Roomly num trampolim de phishing.
 */
test("login volta para a sala em que a reserva começou", async ({ page }) => {
  await page.goto(
    "/entrar?redirecionar=%2Fsalas%2Fsala-executiva%3Fdia%3D2099-01-05",
  );
  await expect(
    page.getByText("Entre para concluir sua reserva", { exact: false }),
  ).toBeVisible();

  await page.getByLabel("E-mail").fill("cliente@roomly.local");
  await page.getByLabel("Senha").fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/salas\/sala-executiva\?dia=2099-01-05/);
});

test("login recusa destino fora do Roomly", async ({ page }) => {
  await page.goto("/entrar");
  // O campo é forjado no navegador de propósito. Conferir só o que a página
  // desenha testaria a limpeza da página, não a do servidor — e o formulário
  // pode ser enviado com qualquer valor, sem passar por ela.
  await page
    .locator('input[name="redirecionar"]')
    .evaluate((campo: HTMLInputElement) => {
      campo.value = "https://sitefalso.example/senha";
    });
  await page.getByLabel("E-mail").fill("cliente@roomly.local");
  await page.getByLabel("Senha").fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/minhas-reservas$/);
});

/**
 * As quatro causas de falha no cadastro tinham uma frase só — que falava de
 * convite com quem nunca teve um e escondia a mais comum, a de esperar o
 * minuto que o Supabase exige entre dois e-mails.
 */
test("cadastro diz qual foi o problema, um por vez", async ({ page }) => {
  // Escopado ao `main`: o anunciador de rotas do Next também tem role=alert.
  const aviso = page.getByRole("main").getByRole("alert");

  await page.goto("/cadastro?erro=aguarde-um-minuto");
  await expect(aviso).toContainText("Espere um minuto");
  await expect(aviso).not.toContainText("convite");

  await page.goto("/cadastro?erro=dados-invalidos");
  await expect(aviso).toContainText("10 caracteres");
  await expect(aviso).not.toContainText("convite");

  await page.goto("/cadastro?erro=convite-invalido");
  await expect(aviso).toContainText("Peça um novo");
});

/**
 * A rota que fecha o cadastro por e-mail. O destino dela viaja dentro de um
 * link de e-mail, que é onde um endereço forjado tem mais chance de ser
 * clicado — então ela passa pela mesma conferência do login.
 */
test("confirmação de e-mail só volta para dentro do Roomly", async ({ page }) => {
  await page.goto(
    "/auth/confirmar?proximo=%2Fsalas%2Fsala-executiva%3Fdia%3D2099-01-05",
  );
  await expect(page).toHaveURL(/\/salas\/sala-executiva\?dia=2099-01-05/);

  await page.goto("/auth/confirmar?proximo=https%3A%2F%2Fsitefalso.example");
  await expect(page).toHaveURL(/\/minhas-reservas$/);
});

/**
 * As páginas institucionais novas existem e são alcançáveis pela navegação —
 * um link de rodapé que leva a 404 é pior do que não ter o link.
 */
test("páginas institucionais carregam pela navegação", async ({ page }) => {
  await page.goto("/");

  const rodape = page.getByRole("contentinfo");
  for (const [nome, heading] of [
    ["Termos de Uso", "Termos de Uso do Roomly"],
    ["Cancelamento e Reembolso", "Política de Cancelamento e Reembolso"],
    ["Perguntas frequentes", "Perguntas frequentes"],
  ] as const) {
    await rodape.getByRole("link", { name: nome, exact: true }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    await page.goBack();
  }

  // "Para empresas" tem chamada para ação e vive no cabeçalho.
  await page.goto("/para-empresas");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Transforme suas salas/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Quero usar o Roomly/ }),
  ).toBeVisible();
});
