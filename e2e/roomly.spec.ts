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
 */
async function pickFreeDay(page: Page) {
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.locator('[data-testid^="day-"][data-state="free"]').first().click();
}

test("customer completes a simulated booking and receives access", async ({
  page,
}) => {
  await page.goto("/salas/sala-executiva");
  await pickFreeDay(page);
  await page.getByTestId("continue-booking").click();
  await expect(
    page.getByRole("heading", { name: "Como prefere pagar?" }),
  ).toBeVisible();
  await page.getByTestId("confirm-payment").click();
  await expect(page.getByTestId("booking-confirmation")).toBeVisible();
  await expect(page.getByText("583 921")).toBeVisible();
});
test("customer cancellation revokes the visible access code", async ({
  page,
}) => {
  await page.goto("/minhas-reservas");
  await page.getByRole("button", { name: "Cancelar reserva" }).click();
  // O cancelamento é uma server action: a asserção espera uma ida ao servidor,
  // que passa dos 5s padrão quando os projetos rodam em paralelo.
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText("Acesso revogado", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("583 921")).not.toBeVisible();
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
  await expect(page.getByText("TTLock B-101")).toBeVisible();
  await page.getByLabel("Buscar em Fechaduras").fill("B-101");
  await page.getByTitle("Buscar").click();
  await expect(page).toHaveURL(/q=B-101/);
  await expect(page.getByText("TTLock A-201")).not.toBeVisible();
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
  const linha = page.getByRole("row").filter({ hasText: "Sala Executiva" });
  await linha.getByRole("button", { name: /Editar/ }).click();

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
  await pickFreeDay(page);

  const chosen = page.locator('[data-testid^="slot-"][aria-pressed="true"]');
  const day = await page
    .locator('[aria-selected="true"][data-testid^="day-"]')
    .getAttribute("data-testid");
  const slot = await chosen.getAttribute("data-testid");
  await expect(chosen).toHaveAttribute("data-state", "available");

  await page.getByTestId("continue-booking").click();
  await page.getByTestId("confirm-payment").click();
  await expect(page.getByTestId("booking-confirmation")).toBeVisible();

  await page.goto(`/salas/${slug}`);
  await page.getByRole("button", { name: "Próximo mês" }).click();
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
