import { expect, test } from "@playwright/test";
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
  await expect
    .poll(() =>
      roomImage.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("catalog.png"),
    fullPage: true,
  });
});
test("customer completes a simulated booking and receives access", async ({
  page,
}) => {
  await page.goto("/salas/sala-executiva");
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
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
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
  await expect(
    page.getByRole("menuitem", { name: "Configurações" }),
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

test("internal worker rejects requests without the cron secret", async ({
  request,
}) => {
  const response = await request.post("/api/internal/jobs/run");
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    error: "unauthorized",
  });
});
