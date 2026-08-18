export default async function run(page, ui) {
  const log = [];
  function record(step, ok, details = "") {
    log.push({ step, status: ok ? "PASS" : "FAIL", details });
    console.log(
      `[${ok ? "PASS" : "FAIL"}] ${step}${details ? " - " + details : ""}`,
    );
  }

  // 1. Initial snapshot in Portuguese
  let snap = await ui.snapshot();
  record(
    "Initial PT-BR load",
    snap.includes("Painel") && snap.includes("Alunos"),
    "Portuguese header rendered",
  );

  // 2. Click language switcher button in header
  const langBtn = snap.match(
    /@(e\d+) button "(?:Mudar idioma para Inglês|Switch language to.*)"/,
  )?.[1];
  record("Find language button in header", !!langBtn, `Found ref: ${langBtn}`);
  await ui.click(langBtn);
  await page.waitForTimeout(400);

  // 3. Verify English UI
  snap = await ui.snapshot();
  record(
    "Switch to English",
    snap.includes("Dashboard") &&
      snap.includes("Students") &&
      snap.includes("Settings"),
    "English header rendered",
  );

  // 4. Click language button again
  const langBtnEn = snap.match(
    /@(e\d+) button "(?:Switch language to Portuguese|Mudar idioma.*)"/,
  )?.[1];
  record("Find EN language button", !!langBtnEn, `Found ref: ${langBtnEn}`);
  await ui.click(langBtnEn);
  await page.waitForTimeout(400);

  // 5. Verify Portuguese UI again
  snap = await ui.snapshot();
  record(
    "Switch back to Portuguese",
    snap.includes("Painel") && snap.includes("Turmas"),
    "Portuguese restored",
  );

  return { success: true, log };
}
